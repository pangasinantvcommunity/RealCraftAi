"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function TunnelScene({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(0.03);

  useEffect(() => {
    speedRef.current = 0.02 + (progress / 100) * 0.08;
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.06);

    const camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 60);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    scene.add(new THREE.AmbientLight(0x7c4dff, 0.6));
    const light = new THREE.PointLight(0x00e5ff, 2, 30);
    light.position.set(0, 0, 5);
    scene.add(light);

    const ringGroup = new THREE.Group();
    const ringCount = 24;
    const ringGeometry = new THREE.TorusGeometry(2.4, 0.02, 8, 48);

    for (let i = 0; i < ringCount; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0x00e5ff : 0x7c4dff,
        transparent: true,
        opacity: 0.35,
      });
      const ring = new THREE.Mesh(ringGeometry, material);
      ring.position.z = -i * 2.2;
      ringGroup.add(ring);
    }
    scene.add(ringGroup);

    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 1.8;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = -Math.random() * ringCount * 2.2;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.7 }),
    );
    scene.add(particles);

    const handleResize = () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    };
    window.addEventListener("resize", handleResize);

    let frameId: number;
    function animate() {
      const speed = speedRef.current;

      ringGroup.children.forEach((mesh) => {
        mesh.position.z += speed;
        if (mesh.position.z > camera.position.z) mesh.position.z -= ringCount * 2.2;
        mesh.rotation.z += 0.002;
      });

      particles.position.z += speed;
      if (particles.position.z > ringCount) particles.position.z = 0;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      ringGeometry.dispose();
      particleGeometry.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} id="tunnel-canvas" className="absolute inset-0 h-full w-full opacity-70" />;
}
