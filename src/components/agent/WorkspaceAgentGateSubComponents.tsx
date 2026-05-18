import React from 'react';

export const WorkspaceAgentGateCheckList: React.FC<{ 
  checks: any[], 
  reviews: any[], 
  onReview: (id: string, status: any, note?: string) => void 
}> = ({ checks, reviews, onReview }) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Gate Kontrolleri</h4>
      {checks.map((check) => {
        const review = reviews.find(r => r.checkId === check.id);
        return (
          <div key={check.id} className={`p-3 rounded-lg border flex flex-col gap-3 ${
            check.status === 'blocked' ? 'bg-red-50 border-red-200' :
            check.status === 'warning' ? 'bg-amber-50 border-amber-200' :
            'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                check.status === 'blocked' ? 'bg-red-500' :
                check.status === 'warning' ? 'bg-amber-500' :
                'bg-green-500'
              }`} />
              <div className="flex-1">
                <div className="text-xs font-bold text-gray-500 mb-1">{check.label}</div>
                <p className={`text-sm ${
                  check.status === 'blocked' ? 'text-red-700' :
                  check.status === 'warning' ? 'text-amber-700' :
                  'text-green-700'
                }`}>{check.message}</p>
              </div>
            </div>
            
            {/* Review Controls */}
            <div className="pt-2 border-t border-gray-200 border-opacity-50">
              <div className="flex gap-2 mb-2">
                {['acknowledged', 'needs_changes', 'pending'].map((status) => (
                  <button
                    key={status}
                    onClick={() => onReview(check.id, status)}
                    className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                      review?.reviewStatus === status 
                        ? 'bg-gray-800 text-white border-gray-800' 
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {status === 'acknowledged' ? 'İNCELENDİ' : status === 'needs_changes' ? 'DEĞİŞİKLİK' : 'BEKLEMEDE'}
                  </button>
                ))}
              </div>
              <input 
                type="text"
                placeholder="İnceleme notu..."
                value={review?.note || ''}
                onChange={(e) => onReview(check.id, review?.reviewStatus || 'pending', e.target.value)}
                className="w-full p-1 text-[11px] border border-gray-300 rounded bg-white bg-opacity-50"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const WorkspaceAgentGateWarnings: React.FC<{ 
  warnings: any[], 
  risks: any[], 
  riskReviews: any[], 
  onRiskReview: (id: string, status: any, note?: string) => void 
}> = ({ warnings, risks, riskReviews, onRiskReview }) => {
  if (warnings.length === 0 && risks.length === 0) return null;

  return (
    <div className="space-y-4">
      {risks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-red-700 uppercase tracking-wider">Tespit Edilen Riskler</h4>
          {risks.map((risk, idx) => {
            const review = riskReviews.find(r => r.riskId === risk.code);
            return (
              <div key={idx} className="p-3 bg-red-100 border border-red-300 rounded-lg flex flex-col gap-2">
                <div className="text-red-800 text-sm">
                  <span className="font-bold mr-2">[{risk.level.toUpperCase()}]</span> {risk.message}
                </div>
                {/* Risk Review Controls */}
                <div className="flex gap-2">
                  {['acknowledged', 'rejected', 'pending'].map((status) => (
                    <button
                      key={status}
                      onClick={() => onRiskReview(risk.code, status)}
                      className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                        review?.reviewStatus === status 
                          ? 'bg-red-800 text-white border-red-800' 
                          : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
                      }`}
                    >
                      {status === 'acknowledged' ? 'İNCELENDİ' : status === 'rejected' ? 'REDDET' : 'BEKLEMEDE'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-amber-700 uppercase tracking-wider">Uyarılar</h4>
          {warnings.map((warning, idx) => (
            <div key={idx} className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm">
              {warning.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const WorkspaceAgentGateDecisionCard: React.FC<{ 
  data: any, 
  review: any, 
  onReview: (status: any, note?: string) => void 
}> = ({ data, review, onReview }) => {
  const isBlocked = data.decision === 'blocked';
  
  return (
    <div className={`p-6 rounded-xl border-2 ${
      isBlocked ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`text-xl font-black ${isBlocked ? 'text-red-800' : 'text-amber-800'}`}>
            {data.decisionLabel}
          </h3>
          <p className="text-sm text-gray-600 mt-1">Status: {data.status} | Evaluated At: {new Date(data.evaluatedAt).toLocaleString()}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold text-white ${isBlocked ? 'bg-red-600' : 'bg-amber-600'}`}>
          {isBlocked ? 'BLOCKING' : 'PENDING REVIEW'}
        </div>
      </div>
      
      <p className="text-gray-800 font-medium mb-6">{data.safeMessage}</p>

      {/* Decision Review Section */}
      <div className="mb-6 p-4 bg-white bg-opacity-40 rounded-lg border border-gray-200">
        <h4 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">Karar İncelemesi</h4>
        <div className="flex gap-2 mb-3">
          {['acknowledged', 'needs_changes', 'rejected', 'pending'].map((status) => (
            <button
              key={status}
              onClick={() => onReview(status)}
              className={`px-3 py-1.5 text-xs font-bold rounded border transition-all ${
                review?.reviewStatus === status 
                  ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105' 
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
              }`}
            >
              {status === 'acknowledged' ? 'İNCELENDİ' : status === 'needs_changes' ? 'DEĞİŞİKLİK' : status === 'rejected' ? 'REDDET' : 'BEKLEMEDE'}
            </button>
          ))}
        </div>
        <textarea 
          placeholder="Karar hakkında inceleme notu..."
          value={review?.note || ''}
          onChange={(e) => onReview(review?.reviewStatus || 'pending', e.target.value)}
          className="w-full p-2 text-sm border border-gray-300 rounded bg-white"
          rows={2}
        />
        <div className="mt-2 text-[10px] text-gray-500 font-bold italic text-center">
          * Bu işaretleme yetki vermez ve hiçbir şeyi çalıştırmaz.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-white bg-opacity-50 rounded-lg border border-gray-200 text-center">
          <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">Yürütme Yetkisi</div>
          <div className="text-sm font-black text-red-600">{data.canExecute ? 'EVET' : 'HAYIR'}</div>
        </div>
        <div className="p-3 bg-white bg-opacity-50 rounded-lg border border-gray-200 text-center">
          <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">Dosya Yazma</div>
          <div className="text-sm font-black text-red-600">{data.canWrite ? 'EVET' : 'HAYIR'}</div>
        </div>
        <div className="p-3 bg-white bg-opacity-50 rounded-lg border border-gray-200 text-center">
          <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">Shell Erişimi</div>
          <div className="text-sm font-black text-red-600">{data.canRunShell ? 'EVET' : 'HAYIR'}</div>
        </div>
        <div className="p-3 bg-white bg-opacity-50 rounded-lg border border-gray-200 text-center">
          <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">Issued Capability</div>
          <div className="text-sm font-black text-gray-400">{data.issuedCapability || 'NULL'}</div>
        </div>
      </div>
    </div>
  );
};
