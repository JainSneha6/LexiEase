import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
import { jsPDF } from 'jspdf';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ReactFlow, { MiniMap, Controls, Background, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.min.js`;

const API_BASE = "https://lexi-ease-ai-l753.vercel.app";

const MindMapGenerator = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [simplifiedText, setSimplifiedText] = useState('');
    const [importantWords, setImportantWords] = useState([]);
    const [importantPoints, setImportantPoints] = useState([]);
    const [loadingText, setLoadingText] = useState(false);
    const [message, setMessage] = useState('');

    // TTS audio ref
    const ttsAudioRef = useRef(null);

    /* =========================
       ElevenLabs TTS helper
    ========================== */
    const speak = async (text) => {
      if (!text || !text.trim()) return;
      try {
        const res = await fetch(`${API_BASE}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (!data?.audio_filename) return;

        let audio = ttsAudioRef.current;
        if (!audio) {
          audio = new Audio();
          ttsAudioRef.current = audio;
        }

        // stop current playback & play new
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) { /* ignore */ }

        audio.src = `${API_BASE}/api/audio/${encodeURIComponent(data.audio_filename)}`;
        await audio.play().catch(() => {});
      } catch (err) {
        console.error('TTS error:', err);
      }
    };

    /* =========================
       Intro voice on mount
    ========================== */
    useEffect(() => {
      speak(
        "Welcome to AI Notes and Mind Map generator. Upload a PDF file. I will create simplified notes and a mind map. After that you can press explain mind map to hear a short walkthrough."
      );
    }, []);

    /* =========================
       File handlers (PDF -> text)
    ========================== */
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log('Selected file:', file);
            setSelectedFile(file);
            setMessage('');
        } else {
            setMessage('Please select a valid file.');
        }
    };

    const extractTextFromPDF = async (file) => {
        const pdfData = await file.arrayBuffer();
        const pdfDoc = await getDocument({ data: pdfData }).promise;
        let text = '';

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            text += pageText + '\n';
        }

        return text.trim();
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setMessage('Please select a file to upload.');
            return;
        }

        try {
            setLoadingText(true);
            const extractedText = await extractTextFromPDF(selectedFile);
            console.log('Extracted text:', extractedText);

            const dataToSend = { content: extractedText };

            const response = await axios.post(`${API_BASE}/api/upload-pdf-notes`, dataToSend, {
                headers: { 'Content-Type': 'application/json' },
            });

            console.log('Response from server:', response.data);
            const simp = response.data.simplified_text || '';
            const impWords = Array.isArray(response.data.important_words) ? response.data.important_words : (response.data.important_words || []);
            const impPoints = Array.isArray(response.data.important_points) ? response.data.important_points : (response.data.important_points || []);

            setSimplifiedText(simp);
            setImportantWords(impWords);
            setImportantPoints(impPoints);

            setMessage('PDF uploaded and simplified successfully!');

            // Announce to user
            speak("Notes and mind map are ready. You can view the simplified notes and the mind map below. Press the explain mind map button to hear a short walkthrough.");
        } catch (error) {
            console.error('Error uploading the PDF:', error.response ? error.response.data : error.message);
            setMessage('Error uploading the PDF! ' + (error.response ? (error.response.data?.message || JSON.stringify(error.response.data)) : error.message));
        } finally {
            setLoadingText(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!simplifiedText) {
            setMessage('No simplified text to download.');
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(simplifiedText, 190);
        let yPosition = 10;
        const lineHeight = 10;

        lines.forEach((line) => {
            if (yPosition + lineHeight > doc.internal.pageSize.height - 10) {
                doc.addPage();
                yPosition = 10;
            }
            doc.text(line, 10, yPosition);
            yPosition += lineHeight;
        });

        doc.save('simplified_text.pdf');
        speak("Downloaded the simplified notes as a PDF.");
    };

    const highlightImportantWords = (text, importantWords) => {
        let highlightedText = text;
        importantWords.forEach(word => {
            if (!word) return;
            const regex = new RegExp(`(${escapeRegExp(word)})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
        });
        return highlightedText;
    };

    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    /* =========================
       Mind Map explanation audio
    ========================== */
    const explainMindMap = async () => {
      if (!importantPoints || importantPoints.length === 0) {
        speak("There is no mind map to explain. Please upload a document first.");
        return;
      }

      // Build a short, clear explanation - keep sentences short for dyslexic-friendly audio
      const maxPoints = Math.min(6, importantPoints.length);
      let text = `This is a short walkthrough of the mind map. There are ${importantPoints.length} main points. `;
      for (let i = 0; i < maxPoints; i++) {
        const p = stripHtml(importantPoints[i]);
        text += `Point ${i + 1}: ${p}. `;
      }
      if (importantPoints.length > maxPoints) {
        text += `And ${importantPoints.length - maxPoints} more points. Press explain again to hear them.`;
      }
      await speak(text);
    };

    const stripHtml = (s) => {
      if (!s) return '';
      return s.replace(/<\/?[^>]+(>|$)/g, "").trim();
    };

    /* =========================
       MindMap rendering helpers
    ========================== */
    const MindMap = ({ importantPoints }) => {
        const { nodes, edges } = createMindMapElements(importantPoints);

        return (
            <div style={{ height: '500px', width: '100%' }}>
                <ReactFlowProvider>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        snapToGrid={true}
                        snapGrid={[15, 15]}
                        style={{ background: '#f0f0f0' }}
                    >
                        <MiniMap />
                        <Controls />
                        <Background color="#aaa" gap={16} />
                    </ReactFlow>
                </ReactFlowProvider>
            </div>
        );
    };

    return (
        <div className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8 flex flex-col items-center" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
            <ToastContainer />
            <h1 className="text-4xl font-bold mb-8 text-blue-800 text-center">AI-Powered Notes and MindMap Generator</h1>

            <div className="mb-4 w-full max-w-md">
                <input
                    type="file"
                    name='file'
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="block w-full border border-gray-300 rounded-md p-2 mb-4"
                />
            </div>

            <button
                className="bg-gradient-to-r from-blue-400 to-blue-600 text-white py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition duration-300 ease-in-out"
                onClick={handleUpload}
            >
                {loadingText ? 'Uploading and Providing Notes...' : 'Upload and Provide Notes'}
            </button>

            {message && <p className="mt-4 text-red-600">{message}</p>}

            {simplifiedText && (
                <div className="mt-4 bg-white shadow-lg rounded-lg p-6 w-full max-w-4xl">
                    <h2 className="text-xl font-bold">Simplified Text:</h2>
                    <p className="mt-2 whitespace-pre-wrap text-gray-700" dangerouslySetInnerHTML={{ __html: highlightImportantWords(simplifiedText, importantWords) }} />

                    <div className="mt-4 flex gap-3">
                        <button
                            className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300 ease-in-out"
                            onClick={handleDownloadPDF}
                        >
                            Download Notes
                        </button>

                        {/* small explain mind map button */}
                        {Array.isArray(importantPoints) && importantPoints.length > 0 && (
                          <button
                            className="bg-indigo-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 transition duration-300 ease-in-out"
                            onClick={explainMindMap}
                          >
                            Explain Mind Map (Audio)
                          </button>
                        )}
                    </div>
                </div>
            )}

            {Array.isArray(importantPoints) && importantPoints.length > 0 && (
                <div className="mt-4 w-full max-w-4xl">
                    <h2 className="text-xl font-bold mb-2">Mind Map:</h2>
                    <MindMap importantPoints={importantPoints} />
                </div>
            )}
        </div>
    );
};

/* =========================
   Create mind map nodes & edges
   (kept similar to your original implementation)
========================= */
const createMindMapElements = (points) => {
    const nodes = [];
    const edges = [];
    const centerX = 500;
    const centerY = 300;
    const radius = 400;

    // create peripheral nodes first
    points.forEach((point, index) => {
        const nodeId = `${index + 1}`;
        const angle = (index / points.length) * 2 * Math.PI;
        const xPos = centerX + radius * Math.cos(angle);
        const yPos = centerY + radius * Math.sin(angle);
        nodes.push({
            id: nodeId,
            data: { label: typeof point === 'string' ? point : JSON.stringify(point) },
            position: {
                x: xPos,
                y: yPos
            },
            style: {
                width: 350,
                height: 150,
                backgroundColor: '#b2ebf2',
                backgroundImage: 'linear-gradient(to right, #e0f7fa, #b2ebf2)',
                border: '2px solid #00796b',
                borderRadius: '15px',
                boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                fontSize: '18px',
                padding: '25px',
                wordWrap: 'break-word',
            }
        });

        if (index > 0) {
            edges.push({
                id: `e${index}-0`,
                source: '0',
                target: nodeId,
                animated: true,
                type: 'bezier',
                style: { stroke: '#00796b' }
            });
        }
    });

    // central idea node (added after to keep same id '0')
    nodes.push({
        id: '0',
        data: { label: 'Central Idea' },
        position: { x: centerX, y: centerY },
        style: {
            width: 350,
            height: 150,
            backgroundColor: '#fff59d',
            border: '2px solid #fbc02d',
            borderRadius: '20px',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            fontSize: '20px',
            padding: '30px',
            fontWeight: 'bold',
        }
    });

    return { nodes, edges };
};

export default MindMapGenerator;
