import modals from "../ModalDesign/modal.module.css";
import plistmodal from "./PListConverter.module.css";
import { useState } from "react";
import { convertJsonToPlist } from "@/utils/tools/PListConverter";

export default function PListConverter() {
  const [files, setFiles] = useState<File[]>([]);

  const handleConvert = async () => {
    if (!files.length) {
      alert("Please select at least one JSON file.");
      return;
    }

    try {
      const blob = await convertJsonToPlist(files);

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "plist-output.zip";
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
        <h2>PLIST Converter</h2>
      </div>

      {/* Upload File Section */}
      <div className={plistmodal.modalInputContainer}>
        <div className={plistmodal.modalDragDropContainer}>
          <label>
            <i className={`${plistmodal.modalIcon} fa-solid fa-image`}></i>
            Select JSON
            <input
              type="file"
              accept=".json"
              multiple
              className="hidden"
              onChange={(e) => {
                if (!e.target.files) return;
                setFiles(Array.from(e.target.files));
              }}
            />
          </label>
        </div>

        {/* Drag n Drop Section */}
        <div
          className={plistmodal.modalDragDropContainer}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            setFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <label>
            <i
              className={`${plistmodal.modalIcon} fa-solid fa-cloud-arrow-up`}
            ></i>
            Drag JSON
          </label>
        </div>
      </div>
      <button
        className={plistmodal.modalConvertButton}
        onClick={handleConvert}
        type="button"
      >
        <i className="fa-solid fa-download"></i>
        Download
      </button>

      <div className={plistmodal.modalPreviewContainer}>
        {files.map((file, index) => (
          <div key={index} className={plistmodal.modalPreviewCard}>
            <i className="fa-solid fa-file-code"></i>

            <div className={plistmodal.modalPreviewInfo}>
              <span className={plistmodal.modalPreviewName}>{file.name}</span>

              <span className={plistmodal.modalPreviewSize}>
                {(file.size / 1024).toFixed(2)} KB
              </span>
            </div>

            <button
              type="button"
              className={plistmodal.modalRemoveButton}
              onClick={() =>
                setFiles((prev) => prev.filter((_, i) => i !== index))
              }
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
