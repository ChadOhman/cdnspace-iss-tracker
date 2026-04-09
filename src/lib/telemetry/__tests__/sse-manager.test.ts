import { describe, it, expect, jest } from "@jest/globals";
import { SseManager } from "../sse-manager";

interface MockController {
  enqueue: ReturnType<typeof jest.fn>;
  close: ReturnType<typeof jest.fn>;
}

function makeMockController(): MockController {
  return {
    enqueue: jest.fn(),
    close: jest.fn(),
  };
}

function asController(mock: MockController): ReadableStreamDefaultController {
  return mock as unknown as ReadableStreamDefaultController;
}

describe("SseManager", () => {
  it("tracks client count (add/remove)", () => {
    const manager = new SseManager();
    expect(manager.getClientCount()).toBe(0);

    const remove1 = manager.addClient(asController(makeMockController()));
    expect(manager.getClientCount()).toBe(1);

    const remove2 = manager.addClient(asController(makeMockController()));
    expect(manager.getClientCount()).toBe(2);

    remove1();
    expect(manager.getClientCount()).toBe(1);

    remove2();
    expect(manager.getClientCount()).toBe(0);
  });

  it("broadcasts to all clients", () => {
    const manager = new SseManager();
    const mock1 = makeMockController();
    const mock2 = makeMockController();

    manager.addClient(asController(mock1));
    manager.addClient(asController(mock2));

    manager.broadcast("update", { foo: "bar" });

    expect(mock1.enqueue).toHaveBeenCalledTimes(1);
    expect(mock2.enqueue).toHaveBeenCalledTimes(1);
  });

  it("encodes SSE event format correctly", () => {
    const result = SseManager.encodeEvent("test", { hello: "world" });
    expect(result).toBe('event: test\ndata: {"hello":"world"}\n\n');
  });

  it("removes clients that error on enqueue", () => {
    const manager = new SseManager();

    const goodMock = makeMockController();
    const badMock: MockController = {
      enqueue: jest.fn().mockImplementation(() => {
        throw new Error("stream closed");
      }),
      close: jest.fn(),
    };

    manager.addClient(asController(goodMock));
    manager.addClient(asController(badMock));
    expect(manager.getClientCount()).toBe(2);

    manager.broadcast("test", { value: 1 });

    expect(manager.getClientCount()).toBe(1);
    expect(goodMock.enqueue).toHaveBeenCalledTimes(1);
  });
});
