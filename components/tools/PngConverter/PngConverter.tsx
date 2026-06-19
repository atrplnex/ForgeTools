import modals from "../ModalDesign/modal.module.css";
import pngmodal from "../PngConverter/PngConverter.module.css";
import { useState } from "react";

export default function PngConverter() {
  const [images, setImages] = useState<File[]>([]);

  return (
    <div className={modals.modalBackground}>
      <div className={modals.modalTitle}>
        <h2>PNG Converter</h2>
      </div>

      {/* Upload File Section */}
      <div className={pngmodal.modalInputContainer}>
        <div className={pngmodal.modalDragDropContainer}>
          <label>
            <i className={`${pngmodal.modalIcon} fa-solid fa-image`}></i>
            Select Images
            <input
              type="file"
              accept=".webp,.jpg,.svg"
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
          className={pngmodal.modalDragDropContainer}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();

            const files = Array.from(e.dataTransfer.files);

            setImages(files);
          }}
        >
          <label>
            <i
              className={`${pngmodal.modalIcon} fa-solid fa-cloud-arrow-up`}
            ></i>
            Drag Images
          </label>
        </div>
      </div>

      <div className={pngmodal.modalConvertButton}>
        <button
          type="button"
        >
          <i className="fa-solid fa-download"></i>
          Download
        </button>
      </div>
      <span>----- Image Preview -----</span>

      {/* Preview Section */}
      <div className={pngmodal.modalPreviewContainer}>
        {images.map((image, index) => {
          const url = URL.createObjectURL(image);

          return (
            <div key={index} className={pngmodal.modalPreviewCard}>
              <img
                src={url}
                alt={image.name}
                className={pngmodal.modalPreviewImage}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
