"use client";

import { useEffect, useRef } from "react";
import type { OrbitalState } from "@/lib/types";

const EARTH_RADIUS_KM = 6371;

interface Globe3DProps {
  orbital: OrbitalState | null;
  width: number;
  height: number;
}

export default function Globe3D({ orbital, width, height }: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const earthRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    import("three").then((THREE) => {
      if (cancelled || !containerRef.current) return;

      // Scene
      const scene = new THREE.Scene();

      // Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.z = 3.5;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);

      // Earth sphere
      const earthGeo = new THREE.SphereGeometry(1, 64, 64);
      const earthMat = new THREE.MeshPhongMaterial({
        color: 0x1a3a5c,
        emissive: 0x0a1520,
        specular: 0x004466,
        shininess: 30,
      });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      scene.add(earth);
      earthRef.current = earth;

      // Wireframe overlay
      const wireGeo = new THREE.SphereGeometry(1.001, 24, 24);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
      });
      const wireframe = new THREE.Mesh(wireGeo, wireMat);
      earth.add(wireframe);

      // ISS marker
      const issGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const issMat = new THREE.MeshBasicMaterial({ color: 0xff3d3d });
      const issMarker = new THREE.Mesh(issGeo, issMat);
      issMarker.visible = false;
      scene.add(issMarker);
      issMarkerRef.current = issMarker;

      // Lights
      const ambientLight = new THREE.AmbientLight(0x223344, 1.5);
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xffffff, 2);
      sunLight.position.set(5, 3, 5);
      scene.add(sunLight);

      // Animation loop
      const animate = () => {
        if (cancelled) return;
        rafRef.current = requestAnimationFrame(animate);
        earth.rotation.y += 0.001;
        renderer.render(scene, camera);
      };
      animate();

      // Cleanup function stored for the return
      (containerRef.current as HTMLDivElement & { __threeCleanup?: () => void }).__threeCleanup = () => {
        cancelled = true;
        cancelAnimationFrame(rafRef.current);
        renderer.dispose();
        earthGeo.dispose();
        earthMat.dispose();
        wireGeo.dispose();
        wireMat.dispose();
        issGeo.dispose();
        issMat.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        issMarkerRef.current = null;
        earthRef.current = null;
      };
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      const el = containerRef.current as (HTMLDivElement & { __threeCleanup?: () => void }) | null;
      if (el?.__threeCleanup) {
        el.__threeCleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // Update ISS marker position when orbital data changes
  useEffect(() => {
    if (!issMarkerRef.current || !orbital) return;

    const { lat, lon, alt } = orbital;
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const scale = 1 + alt / EARTH_RADIUS_KM;

    issMarkerRef.current.position.set(
      scale * Math.cos(latRad) * Math.sin(lonRad),
      scale * Math.sin(latRad),
      scale * Math.cos(latRad) * Math.cos(lonRad)
    );
    issMarkerRef.current.visible = true;
  }, [orbital]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, borderRadius: 4, overflow: "hidden" }}
    />
  );
}
