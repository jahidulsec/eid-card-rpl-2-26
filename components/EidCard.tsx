"use client";

import { useState, useCallback } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { getCroppedImg } from "@/lib/cropImage"; // same helper as before

export default function EidCardEditor() {
  const [imageSrc, setImageSrc]         = useState<string | null>(null);
  const [crop, setCrop]                 = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom]                 = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);     // ← card with photo
  const [croppedBlobUrl, setCroppedBlobUrl] = useState<string | null>(null); // just the cropped face

  const CARD_WIDTH  = 1200;
  const CARD_HEIGHT = 800;

  // Where the black square / photo frame is located in your template
  const PHOTO_X = 380;   // ← you need to measure this
  const PHOTO_Y = 220;
  const PHOTO_W = 440;
  const PHOTO_H = 440;

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Create preview: composite cropped image into the card
  const generatePreview = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      // 1. Get cropped image
      const croppedImgDataUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedBlobUrl(croppedImgDataUrl);

      // 2. Load background template
      const bg = await loadImage("/eid-template.jpg"); // ← put your original image here (with black area)

      const canvas = document.createElement("canvas");
      canvas.width  = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      const ctx = canvas.getContext("2d")!;

      // Draw background
      ctx.drawImage(bg, 0, 0, CARD_WIDTH, CARD_HEIGHT);

      // Draw cropped photo in the black area
      const photoImg = await loadImage(croppedImgDataUrl);
      ctx.drawImage(photoImg, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);

      // Optional: you can draw semi-transparent overlay, logo, etc. here

      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.92));
    } catch (err) {
      console.error("Preview failed:", err);
    }
  }, [imageSrc, croppedAreaPixels]);

  const downloadFinalCard = () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.download = "Eid_Mubarak_MyPhoto.jpg";
    link.href = previewUrl;
    link.click();
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Your Eid Card</h1>

      {/* Upload */}
      <div className="mb-8 text-center">
        <label className="block mb-3 text-lg font-medium">
          Upload your photo
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="file-input file-input-bordered w-full max-w-md"
        />
      </div>

      {/* Crop area + controls */}
      {imageSrc && (
        <>
          <div className="mb-6">
            <div className="relative h-[420px] w-full max-w-[500px] mx-auto border rounded-lg overflow-hidden shadow">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={PHOTO_W / PHOTO_H} // important: match your frame ratio
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="w-64">
                <label className="block text-sm mb-1">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="range range-primary"
                />
              </div>

              <button
                onClick={generatePreview}
                className="btn btn-primary px-10"
                disabled={!croppedAreaPixels}
              >
                Preview in Card
              </button>
            </div>
          </div>

          {/* Preview result */}
          {previewUrl && (
            <div className="mt-10 text-center">
              <h2 className="text-2xl font-semibold mb-4">Preview</h2>
              <img
                src={previewUrl}
                alt="Eid Card Preview"
                className="max-w-full mx-auto rounded-xl shadow-2xl border"
                style={{ maxHeight: "700px" }}
              />

              <div className="mt-8">
                <button
                  onClick={downloadFinalCard}
                  className="btn btn-success btn-lg px-12"
                >
                  Download Final Card
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helper
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}