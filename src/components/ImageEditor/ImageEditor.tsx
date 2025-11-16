"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ImageEditor.module.css";

interface ImageEditorProps {
    image: File | null;
    onSave: (imageData: { file: File; position: { x: number; y: number }; zoom: number }) => void;
    onClose: () => void;
    onUploadNew: () => void;
}

const ImageEditor = ({ image, onSave, onClose, onUploadNew }: ImageEditorProps) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Reset position and zoom when image changes
        setPosition({ x: 0, y: 0 });
        setZoom(1);
    }, [image]);

    const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const newX = touch.clientX - dragStart.x;
        const newY = touch.clientY - dragStart.y;
        setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setZoom(parseFloat(e.target.value));
    };

    const handleSave = () => {
        if (!image) return;
        onSave({ file: image, position, zoom });
        onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!image) return null;

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                    ✕
                </button>

                <h2 className={styles.title}>Adjust Profile Image</h2>

                <div
                    ref={containerRef}
                    className={styles.previewContainer}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className={styles.circularPreview}>
                        <img
                            ref={imageRef}
                            src={URL.createObjectURL(image)}
                            alt="Profile Preview"
                            className={styles.previewImage}
                            style={{
                                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
                                cursor: isDragging ? 'grabbing' : 'grab'
                            }}
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                            draggable={false}
                        />
                    </div>
                    <p className={styles.hint}>Drag the image to reposition</p>
                </div>

                <div className={styles.controls}>
                    <div className={styles.zoomControl}>
                        <label htmlFor="zoom-slider">
                            <span className={styles.zoomLabel}>Zoom</span>
                        </label>
                        <div className={styles.zoomSliderWrapper}>
                            <span className={styles.zoomValue}>-</span>
                            <input
                                id="zoom-slider"
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={zoom}
                                onChange={handleZoomChange}
                                className={styles.slider}
                            />
                            <span className={styles.zoomValue}>+</span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button className={styles.uploadButton} onClick={onUploadNew}>
                            Upload New Image
                        </button>
                        <button className={styles.saveButton} onClick={handleSave}>
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;
