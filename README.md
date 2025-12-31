# LexiEase AI - An AI Powered Dyslexic Support System

**LexiEase AI** is an **AI-powered, voice-first learning platform** designed to support individuals with dyslexia through **high-quality speech synthesis, phonological training, and multimodal learning experiences**.

---

## Table of Contents

- [Introduction](#introduction)
- [What Problems Does LexiEase AI Solve?](#what-problems-does-lexiease-ai-solve)
- [Installation](#installation)
- [Idea](#idea)
- [Dyslexia Screening Tests](#dyslexia-screening-tests)
  - [Phonological Awareness Test](#1-phonological-awareness-test)
  - [Kaufman Assessment Battery Test](#2-kaufman-assessment-battery-test)
  - [Gray Oral Reading Test (GORT)](#3-gray-oral-reading-test-gort)
- [Personalized Learning Paths](#personalized-learning-paths)
  - [Reading Aloud Support](#1-reading-aloud-support)
  - [Reading Comprehension](#2-reading-comprehension)
  - [Memory Games](#3-memory-games)
  - [Phonological Improvement Assistant](#4-phonological-improvement-assistant)
- [Other Features](#other-features)
  - [AI-Powered Writing Support](#1-ai-powered-writing-support)
  - [AI Chatbot](#2-ai-chatbot)
  - [AI-Powered Document Simplification](#3-ai-powered-document-simplification)
  - [Notes & Mind Map Generation from PDF](#4-notes--mind-map-generation-from-pdf)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [User Flow](#user-flow)
- [Snapshots of our Project](#snapshots-of-our-project)

---

## Introduction

Dyslexia is fundamentally a **language-processing challenge**, and **voice is the most powerful accessibility interface**.

LexiEase places **AI-generated speech at the core of learning**:
- Listening before reading  
- Understanding rhythm, stress, and pronunciation  
- Reinforcing phonological awareness through sound  

> **Voice is not an add-on in LexiEase — it is the primary learning medium.**

This makes LexiEase a natural fit for **ElevenLabs’ mission** of making information universally accessible through high-quality voice AI.

---

## What Problems Does LexiEase AI Solve?

**1. Limited Access to Dyslexia Screening**:

Early diagnosis is expensive and inaccessible for many learners.
> **Voice-guided AI screening tests** lower barriers and reduce anxiety.

**2. Text-Heavy Learning Platforms**: 

Traditional platforms overload dyslexic learners with dense text.
> **Everything in LexiEase can be listened to**, reducing cognitive fatigue.

**3. Low Reading Confidence & Retention**:

Silent reading increases stress and slows comprehension.
> **Narrated content and spoken feedback** build confidence and fluency.

---

## Installation

1. Clone the Repository
   ```bash
   git clone https://github.com/SiddharthaChakrabarty/LexiEaseAI.git
   cd LexiEaseAI
   ```
2. Frontend Setup
   - Navigate to the frontend folder.
     ```bash
       cd frontend
     ```
   - Install the dependencies.
     ```bash
       npm install
     ```
   - Run the frontend
     ```bash
       npm start
     ```
3. Backend Setup
    - Navigate to the backend folder.
      ```bash
       cd ../backend
      ```
    - Create a virtual environment and activate it.
      ```bash
      python3 -m venv venv
      source venv/bin/activate
      ```
    - Install the required Python packages.
      ```bash
       pip install -r requirements.txt
      ```
    - Run the backend
      ```bash
       python app.py
      ```
---

## Idea

## Dyslexia Screening Tests

### 1. Phonological Awareness Test
- A cognitive test designed to assess the user's ability to identify and manipulate sounds in spoken words.  
- Includes various subtests to measure awareness of phonemes, syllables, and rhymes.  
<img width="3964" height="1644" alt="image" src="https://github.com/user-attachments/assets/844c099c-c2af-46fe-9f4b-e131d6bcd284" />

### 2. Kaufman Assessment Battery Test
- A comprehensive intelligence test that evaluates both verbal and non-verbal cognitive abilities.  
- Provides insights into cognitive strengths and weaknesses, helping tailor learning paths for individuals.  
<img width="3764" height="1632" alt="image" src="https://github.com/user-attachments/assets/f5ab1e30-2dc6-4b98-ba69-66047111ede5" />

### 3. Gray Oral Reading Test (GORT)
- A standardized test to assess the fluency and comprehension of oral reading.  
- Users read passages aloud, and the system evaluates speed, accuracy, and comprehension.  
<img width="2844" height="1568" alt="image" src="https://github.com/user-attachments/assets/623934e2-5e9a-44e8-8428-258fefb35b97" />

---

## Personalized Learning Paths

### 1. Reading Aloud Support
- Text-to-speech functionality to read out content for users, particularly those with visual impairments or learning disabilities.  
- Helps improve literacy and comprehension by listening to the content aloud.  
<img width="3364" height="1688" alt="image" src="https://github.com/user-attachments/assets/59d09615-4712-4ece-9beb-3d80cb9f7c0f" />

### 2. Reading Comprehension
- Tests and exercises to assess a user’s understanding of written text.  
- Users answer questions based on passages, helping track and improve their comprehension skills.  
<img width="2244" height="1684" alt="image" src="https://github.com/user-attachments/assets/5dd596cf-2ab6-43c1-99cd-626ffa2aff13" />

### 3. Memory Games
- Interactive memory-enhancing games designed to boost cognitive function and memory retention.  
- Games focus on recall, recognition, and matching activities, making learning engaging and fun.  
<img width="2484" height="2048" alt="image" src="https://github.com/user-attachments/assets/13c7eb87-d915-416c-bdc3-c86b8d37cc96" />

### 4. Phonological Improvement Assistant
- A virtual assistant to help users improve their phonological skills.  
- Provides feedback, exercises, and tailored tips to enhance sound recognition and manipulation abilities.  
<img width="2648" height="1788" alt="image" src="https://github.com/user-attachments/assets/af7b58f2-dadb-4189-bed1-85748b919d64" />

---

## Other Features

### 1. AI-Powered Writing Support
- Extracts text from documents or images using a fine-tuned OCR pipeline.  
- Uses DistilBERT to identify mistakes, restructure sentences, improve coherence, and produce polished versions of text.  
<img width="1268" height="928" alt="image" src="https://github.com/user-attachments/assets/6665efdf-73a6-4607-87a7-517f7ffd1b9c" />

### 2. AI Chatbot
- Conversational AI designed to answer queries, provide study assistance, or explain concepts in real-time.  
<img width="1804" height="964" alt="image" src="https://github.com/user-attachments/assets/948ba90d-04be-4ad7-83ce-84f47e456585" />

### 3. AI-Powered Document Simplification
- Simplifies complex documents by rephrasing and summarizing content without losing essential meaning.  
- Helps users better understand dense information by breaking it into digestible chunks.  
<img width="2284" height="616" alt="image" src="https://github.com/user-attachments/assets/51a410a5-25bc-4591-a4eb-a5599826e16c" />

### 4. Notes & Mind Map Generation from PDF
- Converts textual content from PDFs into structured mind maps.  
- Provides visual representation of concepts, aiding understanding of relationships and ideas.  
<img width="2928" height="884" alt="image" src="https://github.com/user-attachments/assets/9701a092-b970-4216-aca5-3cd3af62a80a" />

---

## ElevenLabs Usage
<img width="903" height="522" alt="image" src="https://github.com/user-attachments/assets/eb2f603c-2ea5-4665-939f-4a71e36bc5f9" />

---
## Technology Stack

| Layer / Component | Technologies / Libraries | 
|-------------------|--------------------------|
| Frontend | React, Tailwind CSS |
| Backend | Flask (Python) | 
| Machine Learning / NLP | PyTorch, Hugging Face Transformers (DistilBERT, custom fine-tuning), scikit-learn | 
| Speech & Audio | gTTS & SpeechRecognition(JS) | 
| OCR & Computer Vision | Tesseract, EasyOCR, OpenCV | 
| Document Processing | PyPDF | 
| Personalization / Recommender | Custom rule-based engine | 
| Database & Storage | MySQL | 
| Authentication & Security | OAuth2, bcrypt, JWT |
| Accessibility | OpenDyslexic fonts, Dyslexic-friendly spacing | 

---


## Project Architecture

<img width="4484" height="3128" alt="image" src="https://github.com/user-attachments/assets/3c70eb6d-a92f-4510-9558-6283d4de89e4" />

---

## User Flow
<img width="1123" height="582" alt="image" src="https://github.com/user-attachments/assets/0a2324ce-ac6d-4674-94eb-99ecb5bbd43f" />

---

## Snapshots of our Project
<img width="1919" height="906" alt="image" src="https://github.com/user-attachments/assets/b4f344e6-e5e0-4114-927b-8688f97adef8" />
<img width="1919" height="908" alt="image" src="https://github.com/user-attachments/assets/d6e17bf0-b071-4a31-9d0d-cfd3b9f2b1da" />
<img width="1893" height="909" alt="image" src="https://github.com/user-attachments/assets/b86ba0fd-9208-439e-a402-14ab9b0359f1" />
<img width="1898" height="913" alt="image" src="https://github.com/user-attachments/assets/e15db546-3038-4575-a3d0-c7e499e2fb82" />
<img width="1913" height="914" alt="image" src="https://github.com/user-attachments/assets/5b936c48-cb78-451a-aca4-74eba30c005b" />
<img width="1918" height="913" alt="image" src="https://github.com/user-attachments/assets/ae954e32-9f36-4420-ab01-21be28f00aed" />

---

## License
This project is licensed under the MIT License.





     

