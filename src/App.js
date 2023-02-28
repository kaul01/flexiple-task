import React, { useRef, useState, useEffect } from 'react';
import './App.css';
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/analytics';
import { BsFillCaretUpFill } from 'react-icons/bs';
import { AiFillDelete } from "react-icons/ai";

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';


firebase.initializeApp({
  apiKey: "AIzaSyDwqEqBPzLH4kPR_PEbVvA-xmNPYSKJ5u8",
    authDomain: "saiesh-chat.firebaseapp.com",
    projectId: "saiesh-chat",
    storageBucket: "saiesh-chat.appspot.com",
    messagingSenderId: "416144149501",
    appId: "1:416144149501:web:83c2d441b2dfb6dcfbe794",
    measurementId: "G-64WPEFRRRZ"
})

const auth = firebase.auth();
const firestore = firebase.firestore();


function App() {

  const [user] = useAuthState(auth);

  return (
    <div className="App">

      <header>
        <h2>Flexiple - Chat Room</h2>
        <SignOut />
      </header>

      <section>
        {user ? <ChatRoom /> : <SignIn />}
      </section>

    </div>
  );
}

function SignIn() {

  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  }

  return (
    <>
      <button className="sign-in" onClick={signInWithGoogle}>
        <img className="google" src="google.png" alt="Sign In With Google" />
      </button>
    </>
  )

}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => auth.signOut()}>Sign Out</button>
  )
}


function ChatRoom() {
  const dummy = useRef();
  const messagesRef = firestore.collection('messages');
  const query = messagesRef.orderBy('createdAt').limit(25);
  const [messages] = useCollectionData(query, { idField: 'id' });
  const [formValue, setFormValue] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

     messagesRef.add({
      text: formValue,
      name: auth.currentUser.displayName,
      email: auth.currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL,
      upvotes: 0
    })

    setFormValue('');
    dummy.current.scrollIntoView({ behavior: 'smooth' });
  }

  return (<>
    <main>

      {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}

      <span ref={dummy}></span>

    </main>

    <form className="new-message" onSubmit={sendMessage}>

      <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="say something nice" />

      <button type="submit" disabled={!formValue}>Comment</button>

    </form>
  </>)
}


function ChatMessage(props) {
  const { text,name,email, uid, photoURL,createdAt, upvotes, id } = props.message;
  const messagesRef = firestore.collection('messages');
  const replies = firestore.collection('replies');
  const [formValue, setFormValue] = useState('')
  const [curReplies, setCurReplies] = useState([]);

  const deleteComment = async(e) => {
    e.preventDefault();
    if(window.confirm("Delete this comment?")){
      messagesRef.doc(id).delete();
      replies.doc(id).delete();
    }
  }

  const addUpvotes = async (e) => {
    e.preventDefault();

     messagesRef.doc(id).set({
      text: text,
      name: name,
      email: email,
      createdAt: createdAt,
      uid: uid,
      photoURL: photoURL,
      upvotes: upvotes+1
    })
  }

  const editComment = async (e) => {
    e.preventDefault();
    let editedComment = prompt("Edit your Comment" ,text);
    if (editedComment !== null || editedComment !== "") {
      messagesRef.doc(id).set({
        text: editedComment,
        name: name,
        email: email,
        createdAt: createdAt,
        uid: uid,
        photoURL: photoURL,
        upvotes: upvotes
      })
    } 
  }

  const reply = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    replies.doc(id).collection("all").add({
      text: formValue,
      name: auth.currentUser.displayName,
      parent: id,
      email: auth.currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL,
      upvotes: 0
    })

    setFormValue('');

  }
  useEffect(() => {
    if(auth) {
        replies
        .doc(id)
        .collection('all')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => (
          setCurReplies(snapshot.docs.map(doc => ({
                id: doc.id,
                data: doc.data()
            })))
        ))
    } else {
      setCurReplies([])
    }
  }, [])


  return (<>
  <div className ="messages">
    <div className = "message">
      <div className = "image">
        <div>
            <img src={photoURL} alt="img" />
        </div>
      </div>
      <div className = "message-componets">
        <div className = "message-data">
          <div className = "user-name">
            <h4> {name} </h4>
          </div>
          <div className="message-text">
            <p>{text}</p>
          </div>
        </div>
        <div className = "message-functions">
          <div className="upvote-button">
            <button className="upvote" disabled={uid === auth.currentUser.uid} onClick={addUpvotes}>
              <BsFillCaretUpFill />
              {upvotes}
            </button>
          </div>
          <div className="upvote-button">
            <button className='modal-button' onClick={editComment} disabled={uid !== auth.currentUser.uid}>
                Edit
            </button>
          </div>
          <div className="upvote-button">
            <button className="delete" disabled={uid !== auth.currentUser.uid} onClick={deleteComment}>
              <AiFillDelete />
            </button>
          </div>
          <div className="reply-button">
            <form className="reply-form">
              <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="Reply ... ?" />
              <button disabled={!formValue} onClick={reply}>
                Reply
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
    <div>
            {curReplies?.map(reply => (
                <Reply key={reply.id} message={reply} />
            ))}
    </div>
  </div>
  </>)
}

function Reply(props) {
  const { id } = props.message;
  const{ name, email, uid, photoURL,createdAt, text, parent, upvotes} = props.message.data;

  const editComment = async (e) => {
    e.preventDefault();
    let editedComment = prompt("Edit your Comment" ,text);
    if (editedComment !== null || editedComment !== "") {
      firestore.collection('replies').doc(parent).collection('all').doc(id).set({
        text: editedComment,
        name: name,
        parent: parent,
        email: email,
        createdAt: createdAt,
        uid: uid,
        photoURL: photoURL,
        upvotes: upvotes
      })
    } 
  }

  const deleteReply = async (e) => {
    e.preventDefault();
    if(window.confirm("Delete this comment?")){
      firestore.collection('replies').doc(parent).collection('all').doc(id).delete();
    }
  }

  const addUpvotes = async (e) => {
    e.preventDefault();

    firestore.collection('replies').doc(parent).collection('all').doc(id).set({
      text: text,
      name: name,
      parent: parent,
      email: email,
      createdAt: createdAt,
      uid: uid,
      photoURL: photoURL,
      upvotes: upvotes+1
    })
  }
  return (<div className=''>
  <div className="replies">
      <div className = "message">
        <div className = "image">
          <div>
              <img src={photoURL} alt="img" />
          </div>
          
        </div>
        <div className = "message-componets">
          <div className = "message-data">
            <div className = "user-name">
              <h4> {name} </h4>
            </div>
            <div className="message-text">
              <p>{text}</p>
            </div>
          </div>
          <div className = "message-functions">
            <div className="upvote-button">
              <button disabled={uid === auth.currentUser.uid} onClick={addUpvotes}>
                <BsFillCaretUpFill />
                {upvotes}
              </button>
            </div>
            <div className="upvote-button">
              <button onClick={editComment} disabled={uid !== auth.currentUser.uid}>Edit</button>
            </div>
            <div className="upvote-button">
            <button className="delete" disabled={uid !== auth.currentUser.uid} onClick={deleteReply}>
              <AiFillDelete />
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
    </div>)
}

export default App;