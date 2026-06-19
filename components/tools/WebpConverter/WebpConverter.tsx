import webpDesign from "./WebpConverter.module.css";
import modals from "../ModalDesign/modal.module.css";

export default function WebpConverter() {
    return (
        <div className={modals.modalBackground}>
            <div className={modals.modalTitle}>
                <h2>WebP Converter</h2>
            </div>
            <div className={modals.modalDragDropContainer}>
                <label>Drag Images
                    <i className="fa-solid fa-image"></i>
                    <input type="file" accept=".png,.jpg,.svg" multiple className="hidden"/>
                </label>
            </div>
        </div>
    );
}