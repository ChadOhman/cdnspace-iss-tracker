/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PanelFrame from "../PanelFrame";

describe("PanelFrame", () => {
  it("renders title and children", () => {
    render(
      <PanelFrame title="Test Panel">
        <p>Panel content</p>
      </PanelFrame>
    );
    expect(screen.getByText("Test Panel")).toBeInTheDocument();
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });

  it("collapses and expands when header is clicked in collapsible mode", () => {
    render(
      <PanelFrame title="Collapsible" collapsible>
        <p>Collapsible content</p>
      </PanelFrame>
    );

    const content = screen.getByText("Collapsible content");
    // Initially visible (not collapsed)
    expect(content).toBeVisible();

    const header = screen.getByRole("button");
    fireEvent.click(header);
    // After click, body should be hidden
    const body = content.closest(".panel-body") as HTMLElement;
    expect(body.style.display).toBe("none");

    // Click again to expand
    fireEvent.click(header);
    expect(body.style.display).not.toBe("none");
  });

  it("renders headerRight content", () => {
    render(
      <PanelFrame title="Panel" headerRight={<button>Settings</button>}>
        <p>content</p>
      </PanelFrame>
    );
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
