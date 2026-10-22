/**
 * WanderHub - FastAPI Microservices Architecture & Spec Explorer
 * 
 * Interactive documentation console showcasing the modular Python FastAPI
 * microservice codebases, Pydantic v2 data models, and RBAC security dependencies.
 */

import React, { useState } from 'react';
import { 
  FileCode2, 
  Server, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Zap,
  Terminal
} from 'lucide-react';
import { FASTAPI_MICROSERVICES, FastApiServiceDoc } from '../services/fastapi_reference/fastapi_microservices';

export const FastApiDocsModal: React.FC = () => {
  const [selectedService, setSelectedService] = useState<FastApiServiceDoc>(FASTAPI_MICROSERVICES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedService.pythonSourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Python 3.12+ / FastAPI / Asyncio Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-0.5">
            Microservices Specification & Python Implementation
          </h1>
        </div>

        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
          <span>{copied ? 'Code Copied!' : 'Copy Python FastAPI Code'}</span>
        </button>
      </div>

      {/* Microservice Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FASTAPI_MICROSERVICES.map(svc => (
          <button
            key={svc.id}
            onClick={() => setSelectedService(svc)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              selectedService.id === svc.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/30'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-mono text-[10px] ${selectedService.id === svc.id ? 'text-emerald-400' : 'text-slate-400'}`}>
                Port :{svc.port}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                selectedService.id === svc.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                FastAPI
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold font-display">{svc.name}</h4>
          </button>
        ))}
      </div>

      {/* Selected Microservice Blueprint View */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        
        {/* Service Header Info */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-display">{selectedService.name}</h3>
              <span className="font-mono text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                http://localhost:{selectedService.port}
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl">{selectedService.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">OpenAPI 3.1 Spec:</span>
            <span className="text-xs font-mono bg-white border border-slate-200 px-2 py-1 rounded text-slate-700">
              /docs (Swagger UI)
            </span>
          </div>
        </div>

        {/* Endpoints Table */}
        <div className="p-6 border-b border-slate-200">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Service REST & WebSocket Endpoints</h4>
          <div className="divide-y divide-slate-100 text-xs">
            {selectedService.endpoints.map((ep, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
                    ep.method === 'GET' ? 'bg-sky-50 text-sky-700' :
                    ep.method === 'POST' ? 'bg-emerald-50 text-emerald-700' :
                    ep.method === 'PATCH' ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-slate-800 font-semibold">{ep.path}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500">
                  <span className="text-[11px] font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    Role: {ep.role}
                  </span>
                  <span className="hidden sm:inline text-slate-600">{ep.summary}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Python Source Code Viewer */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-slate-600" />
              Production Python FastAPI Source (Async/Await & Pydantic v2)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Python 3.12+ Standard</span>
          </div>

          <div className="bg-slate-950 text-slate-200 rounded-2xl p-5 overflow-x-auto text-xs font-mono leading-relaxed shadow-inner border border-slate-800 max-h-[500px]">
            <pre>
              <code>{selectedService.pythonSourceCode}</code>
            </pre>
          </div>
        </div>

      </div>

    </div>
  );
};
