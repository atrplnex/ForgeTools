export async function convertImagesToWebp(files: File[], quality: number) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  formData.append("quality", quality.toString());

  const res = await fetch("/api/convert-webp", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "WEBP conversion failed");
  }

  return res.blob();
}
