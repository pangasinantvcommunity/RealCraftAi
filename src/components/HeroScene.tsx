"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.035);

    const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    scene.add(new THREE.AmbientLight(0x7c4dff, 0.5));
    const spotlight = new THREE.DirectionalLight(0x00e5ff, 1.4);
    spotlight.position.set(6, 8, 10);
    scene.add(spotlight);
    const rimLight = new THREE.DirectionalLight(0x7c4dff, 0.8);
    rimLight.position.set(-8, -4, -6);
    scene.add(rimLight);

    const filmGroup = new THREE.Group();
    const filmGeometry = new THREE.PlaneGeometry(2.4, 4.2);
    type FilmMesh = THREE.Mesh & { userData: { floatSpeed: number; floatOffset: number; rotationSpeed: number } };

    for (let i = 0; i < 7; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x7c4dff : 0x00e5ff,
        transparent: true,
        opacity: 0.14,
        roughness: 0.4,
        metalness: 0.3,
        side: THREE.DoubleSide,
      });
      const frame = new THREE.Mesh(filmGeometry, material) as unknown as FilmMesh;
      frame.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 10 - 4);
      frame.rotation.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.4);
      frame.userData = {
        floatSpeed: 0.2 + Math.random() * 0.4,
        floatOffset: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
      };
      filmGroup.add(frame);
    }
    scene.add(filmGroup);

    const cardGroup = new THREE.Group();
    const cardGeometry = new THREE.BoxGeometry(1.4, 2.4, 0.06);
    type CardMesh = THREE.Mesh & { userData: { orbitAngle: number } };

    for (let i = 0; i < 4; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.08,
        roughness: 0.2,
        metalness: 0.6,
      });
      const card = new THREE.Mesh(cardGeometry, material) as unknown as CardMesh;
      const angle = (i / 4) * Math.PI * 2;
      card.position.set(Math.cos(angle) * 5, Math.sin(angle) * 2, Math.sin(angle) * 3 - 3);
      card.userData = { orbitAngle: angle };
      cardGroup.add(card);
    }
    scene.add(cardGroup);

    const particleCount = 500;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 40;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 24;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0x9d7bff, size: 0.045, transparent: true, opacity: 0.6 }),
    );
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove);

    const handleResize = () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    };
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let frameId: number;

    function animate() {
      const elapsed = clock.getElapsedTime();

      filmGroup.children.forEach((mesh) => {
        const frame = mesh as FilmMesh;
        frame.position.y += Math.sin(elapsed * frame.userData.floatSpeed + frame.userData.floatOffset) * 0.002;
        frame.rotation.z += frame.userData.rotationSpeed * 0.005;
      });

      cardGroup.children.forEach((mesh) => {
        const card = mesh as CardMesh;
        const angle = card.userData.orbitAngle + elapsed * 0.15;
        card.position.x = Math.cos(angle) * 5;
        card.position.z = Math.sin(angle) * 3 - 3;
        card.rotation.y = angle;
      });

      particles.rotation.y = elapsed * 0.02;

      camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.02;
      camera.position.y += (-pointer.y * 0.8 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      filmGeometry.dispose();
      cardGeometry.dispose();
      particleGeometry.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-80" />;
}
