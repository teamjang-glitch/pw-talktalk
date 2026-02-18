'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import {
  Users,
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  X,
  ChevronRight,
  Shield,
  Search,
  Lock,
  Unlock,
} from 'lucide-react';
import { Member, SearchLog, GROUPS, ServiceData } from '@/types';

type Tab = 'members' | 'permissions' | 'logs';

interface ServiceWithPermission extends ServiceData {
  allowedGroups: string[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [skipAuth, setSkipAuth] = useState<boolean | null>(null); // null = 로딩 중

  // 멤버 관리 상태
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newGroup, setNewGroup] = useState<typeof GROUPS[number]>(GROUPS[0]);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);

  // 로그 상태
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // 권한 관리 상태
  const [services, setServices] = useState<ServiceWithPermission[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceWithPermission | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [savingPermission, setSavingPermission] = useState(false);

  const isAdmin = skipAuth === true || (session?.user as any)?.isAdmin;

  useEffect(() => {
    // 테스트 모드 확인
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setSkipAuth(data.skipAuth || false);
      })
      .catch(() => setSkipAuth(false));
  }, []);

  useEffect(() => {
    // skipAuth가 아직 로딩 중이면 리다이렉트하지 않음
    if (skipAuth === null) return;

    if (!skipAuth) {
      if (status === 'unauthenticated') {
        router.push('/login');
      } else if (status === 'authenticated' && !(session?.user as any)?.isAdmin) {
        router.push('/');
      }
    }
  }, [status, session, skipAuth, router]);

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'members') {
        fetchMembers();
      } else if (activeTab === 'permissions') {
        fetchServices();
      } else {
        fetchLogs();
      }
    }
  }, [isAdmin, activeTab]);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch('/api/admin/members');
      const data = await res.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Fetch members error:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const res = await fetch('/api/admin/permissions');
      const data = await res.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Fetch services error:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const handlePermissionChange = async (serviceId: string, group: string, enabled: boolean) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const newGroups = enabled
      ? [...service.allowedGroups, group]
      : service.allowedGroups.filter(g => g !== group);

    setSavingPermission(true);
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, allowedGroups: newGroups }),
      });

      if (res.ok) {
        // 로컬 상태 업데이트
        setServices(prev => prev.map(s =>
          s.id === serviceId ? { ...s, allowedGroups: newGroups } : s
        ));
        if (selectedService?.id === serviceId) {
          setSelectedService({ ...selectedService, allowedGroups: newGroups });
        }
      }
    } catch (error) {
      console.error('Permission change error:', error);
    } finally {
      setSavingPermission(false);
    }
  };

  const handleSetAllAccess = async (serviceId: string) => {
    setSavingPermission(true);
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, allowedGroups: [] }),
      });

      if (res.ok) {
        setServices(prev => prev.map(s =>
          s.id === serviceId ? { ...s, allowedGroups: [] } : s
        ));
        if (selectedService?.id === serviceId) {
          setSelectedService({ ...selectedService, allowedGroups: [] });
        }
      }
    } catch (error) {
      console.error('Set all access error:', error);
    } finally {
      setSavingPermission(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/logs?limit=100');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Fetch logs error:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleAddMember = async () => {
    if (!newEmail.trim()) return;

    setAddingMember(true);
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, group: newGroup }),
      });

      if (res.ok) {
        setNewEmail('');
        fetchMembers();
      } else {
        const data = await res.json();
        alert(data.error || '멤버 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Add member error:', error);
      alert('멤버 추가에 실패했습니다.');
    } finally {
      setAddingMember(false);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const text = e.dataTransfer.getData('text');
    processEmailText(text);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    const emailRegex = /[^\s,;]+@[^\s,;]+\.[^\s,;]+/g;
    const emails = text.match(emailRegex) || [];

    // 여러 이메일이 감지되면 bulk 모드로 전환
    if (emails.length > 1) {
      e.preventDefault();
      processEmailText(text);
    }
    // 단일 이메일이면 기본 붙여넣기 동작 허용
  };

  const processEmailText = (text: string) => {
    if (!text) return;

    // 이메일 추출 (줄바꿈, 쉼표, 공백으로 구분)
    const emailRegex = /[^\s,;]+@[^\s,;]+\.[^\s,;]+/g;
    const emails = text.match(emailRegex) || [];

    if (emails.length === 1) {
      // 단일 이메일인 경우 입력창에 넣기
      setNewEmail(emails[0]);
    } else if (emails.length > 1) {
      // 여러 이메일인 경우 bulk 모드
      setBulkEmails(emails);
    }
  };

  const handleBulkAdd = async () => {
    if (bulkEmails.length === 0) return;

    setAddingMember(true);
    let successCount = 0;
    let failCount = 0;

    for (const email of bulkEmails) {
      try {
        const res = await fetch('/api/admin/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, group: selectedGroup || newGroup }),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    alert(`${successCount}명 추가 완료${failCount > 0 ? `, ${failCount}명 실패` : ''}`);
    setBulkEmails([]);
    fetchMembers();
    setAddingMember(false);
  };

  const handleDeleteMember = async (email: string, group: string) => {
    if (!confirm(`${email}(${group})을(를) 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/admin/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, group }),
      });

      if (res.ok) {
        fetchMembers();
      } else {
        alert('멤버 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Delete member error:', error);
      alert('멤버 삭제에 실패했습니다.');
    }
  };

  // skipAuth 로딩 중이거나 인증 확인 중
  if (skipAuth === null || (status === 'loading' && !skipAuth) || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 그룹별 멤버 수 계산
  const membersByGroup = GROUPS.reduce((acc, group) => {
    acc[group] = members.filter((m) => m.group === group).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {skipAuth && !session && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
          테스트 모드 - 관리자 권한으로 접근 중
        </div>
      )}
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">관리자 대시보드</h1>

        {/* 탭 네비게이션 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'members'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            멤버 관리
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'permissions'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            권한 관리
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'logs'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            조회 로그
          </button>
        </div>

        {/* 멤버 관리 탭 - 2분할 레이아웃 */}
        {activeTab === 'members' && (
          <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">
            {/* 왼쪽: 팀 목록 */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 h-full overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="font-semibold text-gray-700">팀 목록</p>
                  <button
                    onClick={fetchMembers}
                    disabled={loadingMembers}
                    className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingMembers ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {/* 전체 보기 */}
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      selectedGroup === null
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-600">전체</p>
                      <Users className={`w-4 h-4 ${selectedGroup === null ? 'text-primary-500' : 'text-gray-400'}`} />
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      {members.length}명
                    </p>
                  </button>

                  {/* 팀별 카드 */}
                  {GROUPS.map((group) => (
                    <button
                      key={group}
                      onClick={() => {
                        setSelectedGroup(group);
                        setNewGroup(group);
                      }}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        selectedGroup === group
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                          : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-600">{group}</p>
                        <ChevronRight className={`w-4 h-4 transition-transform ${
                          selectedGroup === group ? 'rotate-90 text-primary-500' : 'text-gray-400'
                        }`} />
                      </div>
                      <p className="text-2xl font-bold text-gray-800 mt-1">
                        {membersByGroup[group] || 0}명
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽: 멤버 목록 및 수정 */}
            <div className="flex-1">
              <div className="bg-white rounded-xl border border-gray-200 h-full overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white">
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedGroup ? (
                      <span className="text-primary-600">{selectedGroup}</span>
                    ) : (
                      '전체'
                    )}
                    {' '}멤버
                    <span className="ml-2 text-base font-normal text-gray-500">
                      ({(selectedGroup ? members.filter(m => m.group === selectedGroup) : members).length}명)
                    </span>
                  </h2>
                </div>

                {/* 멤버 추가 폼 */}
                <div
                  className={`px-6 py-4 border-b transition-colors ${
                    isDragOver
                      ? 'bg-primary-50 border-primary-300 border-2 border-dashed'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {bulkEmails.length > 0 ? (
                    // 여러 이메일 드롭된 경우
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">
                          {bulkEmails.length}개의 이메일이 감지되었습니다
                        </p>
                        <button
                          onClick={() => setBulkEmails([])}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-32 overflow-y-auto bg-white rounded-lg border border-gray-200 p-3">
                        <div className="flex flex-wrap gap-2">
                          {bulkEmails.map((email, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-sm rounded-full"
                            >
                              {email}
                              <button
                                onClick={() => setBulkEmails(prev => prev.filter((_, i) => i !== idx))}
                                className="hover:text-primary-900"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {!selectedGroup && (
                          <select
                            value={newGroup}
                            onChange={(e) => setNewGroup(e.target.value as typeof GROUPS[number])}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                          >
                            {GROUPS.map((group) => (
                              <option key={group} value={group}>
                                {group}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={handleBulkAdd}
                          disabled={addingMember}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          {addingMember ? '추가 중...' : `${bulkEmails.length}명 일괄 추가`}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 일반 입력 모드
                    <>
                      <div className="flex gap-3">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          onPaste={handlePaste}
                          placeholder={isDragOver ? '여기에 드롭하세요' : '이메일 입력, 붙여넣기 또는 드래그'}
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        />
                        {!selectedGroup && (
                          <select
                            value={newGroup}
                            onChange={(e) => setNewGroup(e.target.value as typeof GROUPS[number])}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                          >
                            {GROUPS.map((group) => (
                              <option key={group} value={group}>
                                {group}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={handleAddMember}
                          disabled={addingMember || !newEmail.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          {selectedGroup ? `${selectedGroup}에 추가` : '추가'}
                        </button>
                      </div>
                      {isDragOver && (
                        <p className="text-center text-primary-600 text-sm mt-2">
                          이메일 목록을 드롭하여 일괄 추가
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* 멤버 목록 */}
                <div className="flex-1 overflow-y-auto">
                  {loadingMembers ? (
                    <div className="p-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                      로딩 중...
                    </div>
                  ) : (selectedGroup ? members.filter(m => m.group === selectedGroup) : members).length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>{selectedGroup ? `${selectedGroup}에 등록된 멤버가 없습니다.` : '등록된 멤버가 없습니다.'}</p>
                      <p className="text-sm mt-1">위 폼에서 멤버를 추가하세요.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {(selectedGroup ? members.filter(m => m.group === selectedGroup) : members).map((member, index) => (
                        <div
                          key={`${member.email}-${member.group}-${index}`}
                          className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-700 font-medium text-sm">
                                {member.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{member.email}</p>
                              {!selectedGroup && (
                                <button
                                  onClick={() => setSelectedGroup(member.group)}
                                  className="text-xs text-primary-600 hover:text-primary-700 mt-0.5"
                                >
                                  {member.group}
                                </button>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMember(member.email, member.group)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 권한 관리 탭 - 2분할 레이아웃 */}
        {activeTab === 'permissions' && (
          <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">
            {/* 왼쪽: 서비스 목록 */}
            <div className="w-96 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 h-full overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="font-semibold text-gray-700">서비스 목록</p>
                  <button
                    onClick={fetchServices}
                    disabled={loadingServices}
                    className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingServices ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* 검색 */}
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="서비스 검색..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loadingServices ? (
                    <div className="p-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      로딩 중...
                    </div>
                  ) : services.filter(s =>
                    s.serviceName.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                    s.url.toLowerCase().includes(serviceSearch.toLowerCase())
                  ).length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      검색 결과가 없습니다.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {services
                        .filter(s =>
                          s.serviceName.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                          s.url.toLowerCase().includes(serviceSearch.toLowerCase())
                        )
                        .map((service) => (
                          <button
                            key={service.id}
                            onClick={() => setSelectedService(service)}
                            className={`w-full px-4 py-3 text-left transition-colors ${
                              selectedService?.id === service.id
                                ? 'bg-primary-50 border-l-4 border-l-primary-500'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-800 truncate">{service.serviceName}</p>
                              {service.allowedGroups.length > 0 ? (
                                <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              ) : (
                                <Unlock className="w-4 h-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{service.url}</p>
                            {service.allowedGroups.length > 0 && (
                              <p className="text-xs text-amber-600 mt-1">
                                {service.allowedGroups.length}개 팀만 접근 가능
                              </p>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 오른쪽: 권한 설정 */}
            <div className="flex-1">
              {selectedService ? (
                <div className="bg-white rounded-xl border border-gray-200 h-full overflow-hidden flex flex-col">
                  {/* 헤더 */}
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">{selectedService.serviceName}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{selectedService.url}</p>
                      </div>
                      <button
                        onClick={() => setSelectedService(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* 현재 상태 */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedService.allowedGroups.length === 0 ? (
                          <>
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <Unlock className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-green-700">전체 접근 가능</p>
                              <p className="text-sm text-gray-500">모든 팀이 이 서비스를 검색할 수 있습니다</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <Lock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-amber-700">제한된 접근</p>
                              <p className="text-sm text-gray-500">
                                {selectedService.allowedGroups.length}개 팀만 검색 가능
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                      {selectedService.allowedGroups.length > 0 && (
                        <button
                          onClick={() => handleSetAllAccess(selectedService.id)}
                          disabled={savingPermission}
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          전체 공개로 변경
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 팀별 권한 설정 */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">팀별 접근 권한 설정</h3>
                    <div className="space-y-2">
                      {GROUPS.map((group) => {
                        const isAllowed = selectedService.allowedGroups.length === 0 ||
                          selectedService.allowedGroups.includes(group);
                        const isExplicitlyAllowed = selectedService.allowedGroups.includes(group);

                        return (
                          <label
                            key={group}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer ${
                              isExplicitlyAllowed
                                ? 'border-primary-300 bg-primary-50'
                                : selectedService.allowedGroups.length === 0
                                ? 'border-gray-200 bg-gray-50'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isAllowed ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                {isAllowed ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                              <span className="font-medium text-gray-800">{group}</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={isExplicitlyAllowed}
                              onChange={(e) => handlePermissionChange(selectedService.id, group, e.target.checked)}
                              disabled={savingPermission}
                              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      * 체크된 팀만 접근 가능. 아무것도 체크하지 않으면 전체 공개됩니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">서비스를 선택하세요</p>
                    <p className="text-sm mt-1">왼쪽 목록에서 서비스를 선택하면<br />팀별 접근 권한을 설정할 수 있습니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 로그 탭 */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">최근 검색 로그</h2>
              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`}
                />
              </button>
            </div>

            {loadingLogs ? (
              <div className="p-8 text-center text-gray-500">로딩 중...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                검색 로그가 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        일시
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        사용자
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        검색어
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        IP 주소
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                        결과
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log, index) => (
                      <tr key={`${log.timestamp}-${index}`}>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(log.timestamp).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {log.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                          {log.searchQuery}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                          {log.ip}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {log.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500 inline" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
