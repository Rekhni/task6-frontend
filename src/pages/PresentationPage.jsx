import React, { useRef, useState, useEffect } from 'react';
import { db, ref, set, onValue, push } from '../utils/firebase';
import { useParams } from 'react-router-dom';
import PresentationCanvas from '../components/PresentationCanvas';
import { useNavigate } from 'react-router-dom';

function PresentationPage() {
    const { id: presentationId } = useParams();
    const [slides, setSlides] = useState([]);
    const [newSlideContent, setNewSlideContent] = useState('');
    const [userRole, setUserRole] = useState('viewer');
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
    const navigate = useNavigate();
    const canvasInstance = useRef(null);

    useEffect(() => {
        const slidesRef = ref(db, `presentations/${presentationId}/slides`);
        onValue(slidesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setSlides(Object.values(data));
            }
        });

        const usersRef = ref(db, `presentations/${presentationId}/users`);
        onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setUsers(Object.values(data));

                const storedUserName = localStorage.getItem('userName');
                const currentUser = Object.values(data).find((user) => user.name === storedUserName);
                if (currentUser) {
                    console.log("Loaded user role from Firebase:", currentUser.role);
                    setUserRole(currentUser.role);
                    localStorage.setItem('userRole', currentUser.role);
                } else {
                    console.warn("User not found in the list, defaulting to viewer");
                    setUserRole('viewer');
                    localStorage.setItem('userRole', 'viewer');
                }
            }
        });
    }, [presentationId, userName])

    const addSlide = async () => {
        if (userRole !== 'creator') {
            setError('Only the creator can add slides.');
            return;
        }

        if (!newSlideContent.trim()) {
            setError('Slide content cannot be empty');
            return;
        }

        try {
            const slidesRef = ref(db, `presentations/${presentationId}/slides`);
            const newSlideRef = push(slidesRef);

            await set(newSlideRef, {
                id: newSlideRef.key,
                content: newSlideContent,
            });

            setNewSlideContent('');
            setError('');
        } catch (err) {
            setError('Failed to add slide. Please try again.');
            console.error(err);
        }
    
    };

    const deleteSlide = async (slideId) => {
        if (userRole !== 'creator') {
            setError('Only the creator can delete slides.');
            return;
        }
    
        try {
            const slideRef = ref(db, `presentations/${presentationId}/slides/${slideId}`);
            await set(slideRef, null); // Removing the slide from Firebase
            console.log(`Slide ${slideId} deleted successfully`);
        } catch (err) {
            setError('Failed to delete slide.');
            console.error(err);
        }
    };

    const updateSlideContent = (slideId, newContent) => {
        if (userRole === 'viewer') {
            setError('Viewers cannot edit slides.');
            return;
        }

        const slideRef = ref(db, `presentations/${presentationId}/slides/${slideId}`);
        set(slideRef, {
            id: slideId,
            content: newContent,
        });
    };

    const promoteToEditor = async (userName) => {
        if (userRole !== 'creator') {
            setError('Only the creator can promote viewers to editors.');
            return;
        }
    
        try {
            const userRef = ref(db, `presentations/${presentationId}/users/${userName}`);
            await set(userRef, {
                name: userName,
                role: 'editor',
            });

            // Update the users list locally to reflect changes immediately
            setUsers((prevUsers) => 
                prevUsers.map((user) => 
                    user.name === userName ? { ...user, role: 'editor' } : user
                )
            );

            // Update local storage if the current user is promoted
            if (userName === localStorage.getItem('userName')) {
                setUserRole('editor');
                localStorage.setItem('userRole', 'editor');
            }

            setError('');
        } catch (err) {
            setError('Failed to promote user to editor.');
            console.error(err);
        }
    }

    const demoteToViewer = async (userName) => {
        if (userRole !== 'creator') {
            setError('Only the creator can demote editors to viewers.');
            return;
        }
    
        try {
            const userRef = ref(db, `presentations/${presentationId}/users/${userName}`);
            await set(userRef, {
                name: userName,
                role: 'viewer',
            });
    
            // Update the users list locally to reflect changes immediately
            setUsers((prevUsers) => 
                prevUsers.map((user) => 
                    user.name === userName ? { ...user, role: 'viewer' } : user
                )
            );
    
            // Update local storage if the current user is demoted
            if (userName === localStorage.getItem('userName')) {
                setUserRole('viewer');
                localStorage.setItem('userRole', 'viewer');
            }
    
            setError('');
            console.log(`${userName} has been demoted to viewer`);
        } catch (err) {
            setError('Failed to demote user to viewer.');
            console.error(err);
        }
    };

    const leavePresentation = async () => {
        const userName = localStorage.getItem('userName');
        const userRole = localStorage.getItem('userRole');

        if (!userName || !userRole) {
            alert("User not found");
            return;
        }

        try {
            
            const canvas = canvasInstance.current;
            if (canvas) {
                const objectsRef = ref(db, `presentations/${presentationId}/canvasObjects`);
                const jsonData = canvas.toJSON();
                await set(objectsRef, jsonData);
                console.log("Canvas state saved before leaving");
            }

            if (userRole !== 'creator') {
                const userRef = ref(db, `presentations/${presentationId}/users/${userName}`);
                await set(userRef, null);
            }

            localStorage.removeItem('userName');
            localStorage.removeItem('userRole');

            alert("You have left the presentation.");
            navigate('/'); // Redirect to the home page
        } catch (err) {
            console.error("Error leaving presentation:", err);
            alert("Failed to leave the presentation.");
        }
    }

    return (
        <div className='d-flex p-3' style={{backgroundColor: '#CBC3E3', paddingBottom: '50px'}}>
            <div className='flex-grow-1 p-3'>
                <h2>Presentation ID: {presentationId}</h2>
                <h3>Role: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}</h3>
                <button className='rounded' onClick={leavePresentation} style={{ marginBottom: '10px', backgroundColor: 'red', color: 'white' }}>
                    Leave Presentation
                </button>
                <div>
                    {userRole === 'creator' && (
                    <div>
                        <input
                            type="text"
                            value={newSlideContent}
                            onChange={(e) => setNewSlideContent(e.target.value)}
                            placeholder='New slide content'
                        />
                        <button onClick={addSlide}>Add Slide</button>
                    </div>
                    )}
                    {error && <p style={{ color: 'red'}}>{error}</p>}
                </div>
                <PresentationCanvas presentationId={presentationId} canvasInstance={canvasInstance}/>
                <ol>
                    {slides.map((slide) => (
                        <li key={slide.id} className="d-flex align-items-center mb-3">
                            <textarea
                                value={slide.content}
                                onChange={(e) => updateSlideContent(slide.id, e.target.value)}
                                readOnly={userRole === 'viewer'}
                                style={{ width: '70%' }}
                                className='rounded' 
                            />
                            {userRole === 'creator' && (
                            <button
                                className='btn bg-white btn-sm ms-2'
                                onClick={() => deleteSlide(slide.id)}
                                title="Delete Slide"
                                style={{ marginTop: 'auto', marginBottom: 'auto' }}
                            >
                                🗑️
                            </button>
                            )}
                        </li>
                    ))}
                </ol>
            </div>
            {userRole === 'creator' && (
                <div className='p-3 rounded shadow text-white' style={{ width: '300px', borderColor: '#581845', backgroundColor: '#9999FF' }}>
                    <h3>Users:</h3>
                    <ul>
                        {users.map((user, index) => (
                            <li key={index} >
                                {user.name} ({user.role}) 

                                {user.role === 'viewer' && (
                                    <button className='bg-success text-white rounded' style={{ fontSize: '12px', marginLeft: '10px' }} onClick={() => promoteToEditor(user.name)}>Promote to Editor</button>
                                )}
                                {user.role === 'editor' && (
                                    <button className='bg-danger text-white rounded' style={{ fontSize: '12px' }} onClick={() => demoteToViewer(user.name)}>Demote to Viewer</button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default PresentationPage;
