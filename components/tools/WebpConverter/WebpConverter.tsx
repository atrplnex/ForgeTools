import webpDesign from "./WebpConverter.module.css";
import modals from "../ModalDesign/modal.module.css";
import webpmodal from "../WebpConverter/WebpConverter.module.css";
import { convertImagesToWebp } from "../../../utils/tools/WebpConverter";
import { useState } from "react";

export default function WebpConverter() {
  const [images, setImages] = useState<File[]>([]);
  const [quality, setQuality] = useState(80);

  const handleConvert = async () => {
    try {
      const blob = await convertImagesToWebp(images, quality);

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "converted.zip";
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Conversion failed");
    }
  };

  return (
    <div className={modals.modalBackground}>
      <div className={modals.modalTitle}>
        <h2>WEBP Converter</h2>
      </div>

      {/* Upload File Section */}
      <div className={webpmodal.modalInputContainer}>
        <div className={webpmodal.modalDragDropContainer}>
          <label>
            <i className={`${webpmodal.modalIcon} fa-solid fa-image`}></i>
            Select Images
            <input
              type="file"
              accept=".png,.jpg,.svg"
              multiple
              className="hidden"
              onChange={(e) => {
                if (!e.target.files) return;

                setImages(Array.from(e.target.files));
              }}
            />
          </label>
        </div>

        {/* Drag n Drop Section */}
        <div
          className={webpmodal.modalDragDropContainer}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();

            const files = Array.from(e.dataTransfer.files);

            setImages(files);
          }}
        >
          <label>
            <i
              className={`${webpmodal.modalIcon} fa-solid fa-cloud-arrow-up`}
            ></i>
            Drag Images
          </label>
        </div>
      </div>

      {/* Quality */}
      <div className={webpmodal.modalQualityContainer}>
        <div className={webpmodal.modalQualityControls}>
          <label>Quality</label>
          <input
            type="range"
            min="1"
            max="100"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
          />

          <input
            className={webpmodal.modalQualityInput}
            type="number"
            min="0"
            max="100"
            value={quality}
            onChange={(e) => {
              const value = Number(e.target.value);

              if (isNaN(value)) return;

              setQuality(Math.min(100, Math.max(1, value)));
            }}
          />
          <span>%</span>
        </div>
      </div>

      <div className={webpmodal.modalConvertButton}>
        <button
          onClick={handleConvert}
          type="button"
        >
          <i className="fa-solid fa-download"></i>
          Download
        </button>
      </div>
      <span>----- Image Preview -----</span>

      {/* Preview Section */}
      <div className={webpmodal.modalPreviewContainer}>
        {images.map((image, index) => {
          const url = URL.createObjectURL(image);

          return (
            <div key={index} className={webpmodal.modalPreviewCard}>
              <img
                src={url}
                alt={image.name}
                className={webpmodal.modalPreviewImage}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
