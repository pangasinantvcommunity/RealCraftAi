import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";

export async function uploadAudio(userId: string, file: Buffer, contentType: string, ext: string) {
  const blob = await put(`audio/${userId}/${randomUUID()}.${ext}`, file, {
    access: "public",
    contentType,
  });
  return blob.url;
}

export async function uploadImage(buffer: Buffer) {
  const blob = await put(`images/${randomUUID()}.png`, buffer, {
    access: "public",
    contentType: "image/png",
  });
  return blob.url;
}

export async function uploadCharacterImage(userId: string, buffer: Buffer, contentType: string, ext: string) {
  const blob = await put(`characters/${userId}/${randomUUID()}.${ext}`, buffer, {
    access: "public",
    contentType,
  });
  return blob.url;
}

export async function uploadVideo(buffer: Buffer) {
  const blob = await put(`videos/${randomUUID()}.mp4`, buffer, {
    access: "public",
    contentType: "video/mp4",
  });
  return blob.url;
}

export async function deleteBlob(url: string) {
  await del(url);
}
