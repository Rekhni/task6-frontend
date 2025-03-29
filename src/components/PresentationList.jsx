import React, { useEffect, useState } from 'react';
import { db, ref, onValue, get, set } from '../utils/firebase';
import { useNavigate } from 'react-router-dom';
const API_URL = import.meta.env.VITE_API_URL;

function PresentationList() {
    const [presentations, setPresentations] = useState([]);
    const [name, setName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const presentationsRef = ref(db, 'presentations');
        onValue(presentationsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const presentationList = Object.keys(data).map((key) => ({
                    id: key,
                    title: data[key].title || 'Untitled',
                    author: data[key].author || 'unknown',
                    createdAt: data[key].createdAt || 'unknown',
                }));
                setPresentations(presentationList);
            }
        });
    }, []);


    const joinPresentation = async (presentationId) => {
        await fetch('https://task6-backend-vdat.onrender.com/api');
        if (!name.trim()) {
            alert('Please enter your name');
            return;
        }

        if (!presentationId.trim()) {
            alert('Please enter a presentation ID');
            return;
        }

        try {
            const presentationRef = ref(db, `presentations/${presentationId}`);
            const snapshot = await get(presentationRef);

            if (!snapshot.exists()) {
                alert('Presentation not found. Please check the ID.');
                return;
            }

            const userRef = ref(db, `presentations/${presentationId}/users/${name}`);
            const userSnapshot = await get(userRef);

            let role = 'viewer';

            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                role = userData.role;
                console.log(`User ${name} already exists with role: ${role}`);
            } else {
                console.log(`User ${name} does not exist, assigning role: ${role}`);
                await set(userRef, {
                    name,
                    role,
                })
            }

            localStorage.setItem('userName', name);
            localStorage.setItem('userRole', role);

            const response = await fetch(`${API_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    presentationId,
                    userId: name,
                    name,
                    role,
                }),
            });

            console.log('Response from API:', response);

            if (response.ok) {
                console.log('Navigating to presentation:', `/presentation/${presentationId}`);
                navigate(`/presentation/${presentationId}`);
            } else {
                console.log('Response not OK:', response.status);
                alert('Failed to join presentation');
            }

        } catch (err) {
            console.error('Error joining presentation:', err);
            alert('Error connecting to the server');
        }
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <div className='p-2 vh-100' style={{backgroundColor: '#CBC3E3'}}>
            <h2 style={{ paddingLeft: '60px' }}>All Presentations</h2>
            <input
                type="text"
                placeholder="Enter Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ marginLeft: '60px' }}
            />
            <table className='table m-2 mx-auto shadow-lg' style={{ width: '90%', borderRadius: '12px' }}>
                <thead className='thead-dark'>
                    <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Uploaded</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {presentations.map((presentation) => (
                        <tr key={presentation.id}>
                            <td>{presentation.title}</td>
                            <td>{presentation.author}</td>
                            <td>{formatDate(presentation.createdAt)}</td>
                            <td>
                                <button className='bg-success text-white rounded border-0' onClick={() => joinPresentation(presentation.id)}>Join</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button className='border-0 text-white rounded' style={{ marginLeft: '60px', backgroundColor: '#581845' }} onClick={() => navigate('/')}>Back to Home</button>
        </div>
    );
}

export default PresentationList;