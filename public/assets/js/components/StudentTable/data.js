import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// 請根據您的 Firebase 設定路徑調整 import，此處假設全域可用 window.db
const db = window.db; 

const COLLECTION_NAME = 'students';
const getCollection = () => collection(db, COLLECTION_NAME);

import { state } from './state.js';

export const fetchData = async () => {
    try {
        const snapshot = await getDocs(getCollection());
        state.allData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => {
            const timeA = a.created_at?.toMillis?.() || 0;
            const timeB = b.created_at?.toMillis?.() || 0;
            return timeB - timeA;
        });
        return state.allData;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
};

export const addData = async (data) => {
    try {
        data.created_at = serverTimestamp();
        await addDoc(getCollection(), data);
    } catch (error) {
        console.error("Error adding data:", error);
        throw error;
    }
};

export const updateData = async (id, data) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error updating data:", error);
        throw error;
    }
};

export const deleteData = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting data:", error);
        throw error;
    }
};

export const batchDeleteData = async (ids) => {
    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            const docRef = doc(db, COLLECTION_NAME, id);
            batch.delete(docRef);
        });
        await batch.commit();
    } catch (error) {
        console.error("Error batch deleting data:", error);
        throw error;
    }
};
