import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storyConfig, isDevMode } from "@/lib/config";
import { uploadCharacterImage } from "@/lib/storage";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Please choose a character photo." }, { status: 422 });
  }

  if (!ALLOWED_MIME_TYPES.includes(image.type)) {
    return NextResponse.json({ error: "Character photos must be PNG, JPEG, or WEBP." }, { status: 422 });
  }

  const maxBytes = storyConfig.maxCharacterImageMb * 1024 * 1024;
  if (image.size > maxBytes) {
    return NextResponse.json(
      { error: `Character photos must be smaller than ${storyConfig.maxCharacterImageMb}MB.` },
      { status: 422 },
    );
  }

  const buffer = Buffer.from(await image.arrayBuffer());

  if (isDevMode) {
    const url = `data:${image.type};base64,${buffer.toString("base64")}`;
    return NextResponse.json({ url }, { status: 201 });
  }

  const url = await uploadCharacterImage(session.user.id, buffer, image.type, EXT_BY_MIME[image.type]);
  return NextResponse.json({ url }, { status: 201 });
}
