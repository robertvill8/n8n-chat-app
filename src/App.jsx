import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Upload, File, X } from 'lucide-react';

export default function N8NChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [uploadedFile, setUploadedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Prüfe Dateityp
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert('Bitte nur PDF, PNG oder JPG Dateien hochladen!');
        return;
      }
      
      // Prüfe Dateigröße (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Datei ist zu groß! Maximal 5MB erlaubt.');
        return;
      }

      setUploadedFile(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !uploadedFile) || !webhookUrl.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: input || (uploadedFile ? `[Datei hochgeladen: ${uploadedFile.name}]` : ''),
      sender: 'user',
      timestamp: new Date().toISOString(),
      file: uploadedFile ? { name: uploadedFile.name, type: uploadedFile.type } : null
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentFile = uploadedFile;
    setInput('');
    setUploadedFile(null);
    setIsLoading(true);

    try {
      let fileData = null;
      
      // Datei zu Base64 konvertieren wenn vorhanden
      if (currentFile) {
        fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve({
              name: currentFile.name,
              type: currentFile.type,
              data: base64
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(currentFile);
        });
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          sessionId: sessionId,
          timestamp: new Date().toISOString(),
          file: fileData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const aiMessage = {
        id: Date.now() + 1,
        text: data.response || data.output || data.message || 'Keine Antwort erhalten',
        sender: 'ai',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Fehler beim Senden:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: `Fehler: ${error.message}. Bitte überprüfe die Webhook-URL.`,
        sender: 'error',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-400" />
            Rechnungs-Assistent
          </h1>
          <p className="text-sm text-slate-400 mt-1">PDF/Bild hochladen & Fragen stellen</p>
          <div className="mt-3">
            <input
              type="text"
              placeholder="N8N Webhook URL eingeben..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 mt-20">
              <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Lade eine Rechnung hoch oder stelle eine Frage</p>
              <p className="text-sm mt-2">Unterstützte Formate: PDF, PNG, JPG (max. 5MB)</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-2xl px-4 py-3 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : msg.sender === 'error'
                    ? 'bg-red-500/20 text-red-200 border border-red-500/50 rounded-bl-none'
                    : 'bg-slate-700/50 text-white rounded-bl-none backdrop-blur-sm'
                }`}
              >
                {msg.file && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-600">
                    <File className="w-4 h-4" />
                    <span className="text-xs opacity-75">{msg.file.name}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                <p className="text-xs mt-1 opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString('de-DE', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-slate-700/50 text-white px-4 py-3 rounded-2xl rounded-bl-none backdrop-blur-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-t border-slate-700 p-4">
        <div className="max-w-4xl mx-auto">
          {/* File Upload Preview */}
          {uploadedFile && (
            <div className="mb-2 flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded-lg">
              <File className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-white flex-1">{uploadedFile.name}</span>
              <button
                onClick={removeFile}
                className="text-slate-400 hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            {/* File Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!webhookUrl.trim() || isLoading}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
              title="Datei hochladen (PDF, PNG, JPG)"
            >
              <Upload className="w-5 h-5" />
            </button>

            {/* Message Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nachricht oder Frage zur Rechnung..."
              disabled={!webhookUrl.trim() || isLoading}
              className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={(!input.trim() && !uploadedFile) || !webhookUrl.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Senden
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}