import React, { useRef, useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { db, ref, set, onValue } from '../utils/firebase';
import 'bootstrap-icons/font/bootstrap-icons.css';


const PresentationCanvas = ({ presentationId, canvasInstance }) => {
    const canvasRef = useRef(null);
    const isLoading = useRef(false); 
    const isFirebaseUpdating = useRef(false);
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'viewer');

    const debounce = (func, delay) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    const saveCanvasState = debounce(() => {
        const canvas = canvasInstance.current;
        if (!canvas || !canvas.toJSON) return;
        if (isLoading.current) return; 

        try {
            const jsonData = canvas.toJSON();
            const objectsRef = ref(db, `presentations/${presentationId}/canvasObjects`);
            isFirebaseUpdating.current = true;
            set(objectsRef, jsonData).then(() => {
                isFirebaseUpdating.current = false;
                console.log("Canvas state saved to Firebase");
            }).catch((err) => {
                console.error("Error saving canvas state:", err);
                isFirebaseUpdating.current = false;
            });;
        } catch (err) {
            console.error("Error saving canvas state:", err);
        }
    }, 300);

    useEffect(() => {
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: 800,
            height: 400,
            backgroundColor: 'white',
        });
        canvasInstance.current = canvas;

        const updateObjectInteraction = (obj) => {
            if (userRole === 'viewer') {
                obj.selectable = false;
                obj.evented = false;
            } else {
                obj.selectable = true;
                obj.evented = true;
            }
        };

        const updateAllObjectInteractions = () => {
            canvas.forEachObject((obj) => {
                updateObjectInteraction(obj);
            });
            canvas.renderAll();
        };


        const objectsRef = ref(db, `presentations/${presentationId}/canvasObjects`);

        const loadCanvasState = () => {
            onValue(objectsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    if (isFirebaseUpdating.current) {
                        console.log("Ignoring Firebase-triggered update");
                        return;
                    }
                    isLoading.current = true;
                    try {
                        canvas.loadFromJSON(data, () => {
                            updateAllObjectInteractions();
                            canvas.renderAll();
                            canvas.requestRenderAll();
                            isLoading.current = false;
                            console.log("Canvas loaded from Firebase");
                        }, (err) => {
                            if (err) {
                                console.error("Error while loading from JSON:", err);
                                isLoading.current = false;
                            }
                        });
                    } catch (error) {
                        console.error("Error loading canvas state:", error);
                        isLoading.current = false;
                    }
                }
            });
        }

        loadCanvasState();

        const handleObjectModified = () => {
            if (!canvas) return;
            if (!isLoading.current) saveCanvasState();
        };

        canvas.on('object:added', (e) => {
            if (userRole === 'viewer' && e.target) {
                updateObjectInteraction(e.target);
            }
            saveCanvasState();
        });

        canvas.on('object:modified', handleObjectModified);
        canvas.on('object:removed', handleObjectModified);

        return () => {
            if (canvas) {
                canvas.off('object:modified', handleObjectModified);
                canvas.off('object:added', handleObjectModified);
                canvas.off('object:removed', handleObjectModified);
                canvas.dispose();
            }
        };
    }, [presentationId, userRole]);

    useEffect(() => {
        const userName = localStorage.getItem('userName');
        const userRoleRef = ref(db, `presentations/${presentationId}/users/${userName}`);
        onValue(userRoleRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.role) {
                setUserRole(data.role);
                console.log(`Role updated to: ${data.role}`);
            }
        });
    }, [presentationId]);

    const enableDrawing = () => {
        if (userRole === 'viewer') return;
        const canvas = canvasInstance.current;
        if (!canvas) return;
        canvas.isDrawingMode = !canvas.isDrawingMode;
    };

    const addRectangle = () => {
        if (userRole === 'viewer') return;
        const canvas = canvasInstance.current;
        if (!canvas) return;
        const rect = new fabric.Rect({
            left: 50,
            top: 50,
            fill: 'blue',
            width: 100,
            height: 100,
        });
        canvas.add(rect);
        canvas.renderAll();
    };

    const addCircle = () => {
        if (userRole === 'viewer') return;
        const canvas = canvasInstance.current;
        if (!canvas) return;
        const circle = new fabric.Circle({
            left: 150,
            top: 150,
            radius: 50,
            fill: 'red',
        });
        canvas.add(circle);
        canvas.renderAll();
    };

    const addArrow = () => {
        if (userRole === 'viewer') return;
        const canvas = canvasInstance.current;
        if (!canvas) return;
        const line = new fabric.Line([50, 100, 200, 100], {
            stroke: 'green',
            strokeWidth: 5,
        });
        canvas.add(line);
        canvas.renderAll();
    };

    const eraseElement = () => {
        if (userRole === 'viewer') return;
        const canvas = canvasInstance.current;
        if (!canvas) return;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            canvas.remove(activeObject);
            canvas.renderAll();
        }
    };

    const exportToImage = () => {
        if (userRole === 'viewer') return;
        const canvas = canvasInstance.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL({
            format: 'png',
            quality: 1,
        });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'slide.png';
        link.click();
    };

    return (
        <div style={{ marginBottom: '40px' }}>
            <div className='d-flex gap-2 m-2'>
                <button onClick={enableDrawing} disabled={userRole === 'viewer'}><i className="bi bi-hand-index-thumb"></i> </button>
                <button onClick={addRectangle} disabled={userRole === 'viewer'}><i className="bi bi-square"></i></button>
                <button onClick={addCircle} disabled={userRole === 'viewer'}><i className="bi bi-circle"></i></button>
                <button onClick={addArrow} disabled={userRole === 'viewer'}><i className="bi bi-arrow-right"></i></button>
                <button onClick={eraseElement} disabled={userRole === 'viewer'}><i className="bi bi-eraser"></i></button>
                <button onClick={exportToImage} disabled={userRole === 'viewer'}><i className="bi bi-file-earmark-arrow-down"></i></button>
            </div>
            <canvas className='rounded' style={{ marginTop: '10px' }} ref={canvasRef} id="canvas"/>
        </div>
    )
}

export default PresentationCanvas;

