import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { set, ref, db } from '../utils/firebase';
const API_URL = import.meta.env.VITE_API_URL;

function generatePresentationId() {
    return 'pres-' + Math.random().toString(36).substr(2, 9);
}

function Home() {   
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const navigate = useNavigate();

    const handleCreatePresentation = async () => {
        if (!name.trim()) {
            alert('Please enter your name');
            return;
        }
        const newPresentationId = generatePresentationId();
        localStorage.setItem('userName', name);
        localStorage.setItem('userRole', 'creator');

        const response = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
                presentationId: newPresentationId,
                userId: name,
                name,
                role: 'creator',
            }),
        });

        const presentationRef = ref(db, `presentations/${newPresentationId}`);
        await set(presentationRef, {
            title,
            author: name,
            createdAt: new Date().toISOString(),
        });

        const userRef = ref(db, `presentations/${newPresentationId}/users/${name}`);
        await set(userRef, {
            name: name,
            role: 'creator',
        });

        if (response.ok) {
            navigate(`/presentation/${newPresentationId}`);
        } else {
            alert('Failed to create presentation');
        }
    };


    const openPresentationList = () => {
        navigate('/presentations');
    } 

    return (
        <div className='d-flex flex-column justify-content-center align-items-center vh-100 text-center gap-3' style={{backgroundColor: '#CBC3E3'}}>
            <h1 style={{ color: '#581845'}}>Collaborative Presentation Software</h1>
            <input
                type="text"
                placeholder="Enter Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                type="text"
                placeholder="Enter Presentation Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <div>
                <button className='rounded text-white bg-success border-0' onClick={handleCreatePresentation}>Create New Presentation</button>
            </div>
            <button className='rounded text-white border-0' style={{ backgroundColor: '#581845'}} onClick={openPresentationList}>List Of Presentations</button>
        </div>
    )
};

export default Home;