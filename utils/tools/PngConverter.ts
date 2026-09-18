export async function convertImagesToPng(
  images: File[],
  quality?: number
): Promise<Blob> {
  const formData = new FormData();

  images.forEach((img) => formData.append("images", img));

  const res = await fetch("/api/convert-png", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Conversion failed");
  }

  return res.blob();
}