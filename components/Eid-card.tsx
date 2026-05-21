"use client";

import { Button, Card, Input, Slider, message } from "antd";
import {
  ArrowBigDown,
  ArrowBigLeft,
  ArrowBigRight,
  ArrowBigUp,
  CloudDownload,
  CloudUpload,
} from "lucide-react";

import { useRef, useState } from "react";

export default function EidCard() {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [text, setText] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const move = (dx: number, dy: number) => {
    setPosition((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setUserPhoto(url);

    message.success("Photo uploaded!");
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = async () => {
    try {
      setIsProcessing(true);

      const hide = message.loading("Creating GIF...", 0);

      const response = await fetch("/images/Eid-card.gif");
      const buffer = await response.arrayBuffer();

      const gifuct = await import("gifuct-js");
      const parsedGif = gifuct.parseGIF(buffer);
      const rawFrames = gifuct.decompressFrames(parsedGif, true);

      const originalWidth = parsedGif.lsd.width;
      const originalHeight = parsedGif.lsd.height;

      const scale = 0.7;
      const width = originalWidth * scale;
      const height = originalHeight * scale;

      const GIF = (await import("gif.js")).default;

      const gif = new GIF({
        workers: 2,
        quality: 25,
        width,
        height,
        workerScript: "/gif.worker.js",
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const offCanvas = document.createElement("canvas");
      offCanvas.width = originalWidth;
      offCanvas.height = originalHeight;

      const offCtx = offCanvas.getContext("2d");
      if (!offCtx) return;

      const uploadedImage = userPhoto
        ? await new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = userPhoto;
          })
        : null;

      for (let i = 0; i < rawFrames.length; i++) {
        const f = rawFrames[i];

        const imageData = new ImageData(
          new Uint8ClampedArray(f.patch),
          f.dims.width,
          f.dims.height,
        );

        const patchCanvas = document.createElement("canvas");
        patchCanvas.width = f.dims.width;
        patchCanvas.height = f.dims.height;

        const pctx = patchCanvas.getContext("2d");
        if (!pctx) continue;

        pctx.putImageData(imageData, 0, 0);
        offCtx.drawImage(patchCanvas, f.dims.left, f.dims.top);

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(offCanvas, 0, 0, width, height);

        if (uploadedImage) {
          const size = width * 0.28;
          const radius = 16;

          const x = width * 0.5 - size / 2 + position.x;
          const y = height * 0.666 - size / 2 + position.y;

          ctx.save();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + size - radius, y);
          ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
          ctx.lineTo(x + size, y + size - radius);
          ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
          ctx.lineTo(x + radius, y + size);
          ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(uploadedImage, x, y, size, size);
          ctx.restore();
        }

        if (text) {
          const baseFontSize = width * 0.04;

          const fontSize =
            text.length > 24 ? baseFontSize * (24 / text.length) : baseFontSize;

          ctx.font = `${fontSize}px Arial, sans-serif`;
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          ctx.fillText(text, width / 2, height * 0.85);
        }

        gif.addFrame(ctx, {
          copy: true,
          delay: Math.max(f.delay, 120),
        });
      }

      gif.on("finished", (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `eid-${text || "card"}.gif`;

        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);

        hide();
        message.success("GIF Downloaded!");
        setIsProcessing(false);
      });

      gif.on("abort", () => {
        hide();
        message.error("GIF creation failed!");
        setIsProcessing(false);
      });

      gif.render();
    } catch (err) {
      console.error(err);
      message.error("Something went wrong!");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4">
      <div className="w-full max-w-md">
        <Card className="mb-4 overflow-hidden">
          <div className="relative">
            {userPhoto && (
              <div
                className="absolute left-1/2 top-[67%] z-10"
                style={{
                  transform: `
                    translate(-50%, -50%)
                    translate(${position.x}px, ${position.y}px)
                    scale(${zoom})
                  `,
                }}
              >
                <img
                  src={userPhoto}
                  alt=""
                  className="w-32 h-auto object-cover"
                />
              </div>
            )}

            <img
              src="/images/Eid-card.gif"
              className="w-full block relative z-20"
              alt=""
            />

            {text && (
              <div
                className="absolute left-1/2 bottom-[12%] z-30"
                style={{ transform: "translateX(-50%)" }}
              >
                <h1
                  className="text-white whitespace-nowrap"
                  style={{
                    fontSize:
                      text.length > 24
                        ? `${Math.max(10, 18 * (24 / text.length))}px`
                        : "18px",
                  }}
                >
                  {text}
                </h1>
              </div>
            )}
          </div>
        </Card>

        <div className="justify-center flex mt-4">
          <Card className="w-[350px]">
            <div className="mb-3">
              <label className="text-sm font-medium text-gray-700">
                Zoom: {Math.round(zoom * 100)}%
              </label>
              <Slider
                min={0.5}
                max={2}
                step={0.05}
                value={zoom}
                onChange={setZoom}
                className="!ml-0"
              />
            </div>

            <div className="mb-2">
              <label className="text-sm font-medium text-gray-700">
                Move Photo
              </label>
              <div className="flex gap-2 mb-3 mt-2 ">
                <Button
                  icon={<ArrowBigUp size={16} />}
                  onClick={() => move(0, -8)}
                />
                <Button
                  icon={<ArrowBigDown size={16} />}
                  onClick={() => move(0, 8)}
                />
                <Button
                  icon={<ArrowBigLeft size={16} />}
                  onClick={() => move(-8, 0)}
                />
                <Button
                  icon={<ArrowBigRight size={16} />}
                  onClick={() => move(8, 0)}
                />
              </div>
            </div>

            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your name..."
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhotoUpload}
            />

            <div className="flex gap-2 mt-4">
              <Button
                block
                icon={<CloudUpload size={16} />}
                onClick={openFileDialog}
              >
                Upload Photo
              </Button>

              <Button
                block
                type="primary"
                loading={isProcessing}
                icon={<CloudDownload size={16} />}
                onClick={handleDownload}
                style={{ backgroundColor: "#22c55e" }}
              >
                Download GIF
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
