'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  X,
  Globe,
  Key,
  FileText,
  User,
  TrendingUp,
} from 'lucide-react';
import { ServiceData } from '@/types';

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [popularServices, setPopularServices] = useState<ServiceData[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    setShowPassword(false);
  }, [selectedService]);

  // 인기 서비스 로드
  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const res = await fetch('/api/popular');
        const data = await res.json();
        setPopularServices(data.services || []);
      } catch (error) {
        console.error('Popular services error:', error);
      } finally {
        setLoadingPopular(false);
      }
    };
    fetchPopular();
  }, []);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const maskPassword = (password: string) => {
    return '•'.repeat(Math.min(password.length || 8, 16));
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text || '';
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</span>
      ) : (part)
    );
  };

  return (
    <div className="w-full">
      {/* 검색 입력 */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="서비스명 또는 URL로 검색하세요"
          className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm hover:shadow-md bg-white"
          autoFocus
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-sm text-gray-400">검색 중</span>
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* 검색 결과 없음 */}
      {query && !loading && results.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">&apos;{query}&apos;에 대한 검색 결과가 없습니다.</p>
        </div>
      )}

      {/* 2분할 레이아웃 */}
      {results.length > 0 && (
        <div className="flex gap-6 h-[calc(100vh-250px)] min-h-[500px]">
          {/* 왼쪽: 검색 결과 리스트 */}
          <div className={`${selectedService ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
            <div className="bg-white rounded-xl border border-gray-200 h-full overflow-hidden flex flex-col shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-primary-600">{results.length}</span>개의 검색 결과
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {results.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={`px-4 py-4 border-b border-gray-100 cursor-pointer transition-colors ${
                      selectedService?.id === service.id
                        ? 'bg-primary-50 border-l-4 border-l-primary-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">
                          {highlightMatch(service.serviceName, query)}
                        </h3>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {highlightMatch(service.url, query)}
                        </p>
                      </div>
                      {service.lastModified && (
                        <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                          {service.lastModified}
                        </span>
                      )}
                    </div>
                    {service.usage && (
                      <p className="text-xs text-gray-400 mt-2 truncate">{service.usage}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 상세 정보 패널 */}
          {selectedService && (
            <div className="w-1/2 transition-all duration-300 animate-in slide-in-from-right">
              <div className="bg-white rounded-xl border border-gray-200 h-full overflow-hidden flex flex-col shadow-sm">
                {/* 헤더 */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 truncate">
                    {selectedService.serviceName}
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedService(null);
                      if (!query) setResults([]);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 상세 내용 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* URL */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Globe className="w-4 h-4" />
                      URL
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm break-all">
                        {selectedService.url || '-'}
                      </div>
                      {selectedService.url && (
                        <>
                          <a
                            href={selectedService.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                          <button
                            onClick={() => copyToClipboard(selectedService.url, 'url')}
                            className="p-2.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            {copiedField === 'url' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 계정 ID */}
                  {selectedService.accountId && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <User className="w-4 h-4" />
                        계정 ID
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm">
                          {selectedService.accountId}
                        </div>
                        <button
                          onClick={() => copyToClipboard(selectedService.accountId, 'accountId')}
                          className="p-2.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          {copiedField === 'accountId' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 비밀번호 */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Key className="w-4 h-4" />
                      비밀번호
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 font-mono text-base">
                        {showPassword ? selectedService.password : maskPassword(selectedService.password)}
                      </div>
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(selectedService.password, 'password')}
                        className="p-2.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        {copiedField === 'password' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* 용도 */}
                  {selectedService.usage && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <FileText className="w-4 h-4" />
                        용도
                      </label>
                      <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-700">
                        {selectedService.usage}
                      </div>
                    </div>
                  )}

                  {/* 최종 수정일 */}
                  {selectedService.lastModified && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <Calendar className="w-4 h-4" />
                        최종 수정일
                      </label>
                      <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-700">
                        {selectedService.lastModified}
                      </div>
                    </div>
                  )}
                </div>

                {/* 푸터 - 빠른 복사 버튼 */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex gap-3">
                    {selectedService.accountId && (
                      <button
                        onClick={() => copyToClipboard(selectedService.accountId, 'id-quick')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                      >
                        {copiedField === 'id-quick' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        ID 복사
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(selectedService.password, 'pw-quick')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      {copiedField === 'pw-quick' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      PW 복사
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 초기 상태 - 인기 서비스 */}
      {!query && results.length === 0 && (
        <div>
          {/* 인기 서비스 헤더 */}
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-700">자주 찾는 서비스</h2>
          </div>

          {loadingPopular ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : popularServices.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {popularServices.map((service) => (
                <div
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setResults([service]);
                  }}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-primary-300 transition-all"
                >
                  <h3 className="font-semibold text-gray-800 truncate mb-1">
                    {service.serviceName}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {service.url || '-'}
                  </p>
                  {service.usage && (
                    <p className="text-xs text-gray-400 mt-2 truncate">
                      {service.usage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Key className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p>서비스명 또는 URL을 검색하세요</p>
              <p className="text-sm mt-1">예: AWS, github, figma, notion 등</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
