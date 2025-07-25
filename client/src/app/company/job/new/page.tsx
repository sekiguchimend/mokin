'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import NewJobHeader from '@/app/company/company/job/NewJobHeader';
import { Modal } from '@/components/ui/mo-dal';
import { CompanyGroup } from '@/app/company/company/job/types';
import { LocationModal } from '@/app/company/company/job/LocationModal';
import { JobTypeModal } from '@/app/company/company/job/JobTypeModal';
import { IndustryModal } from '@/app/company/company/job/IndustryModal';
import { FormFields } from '@/app/company/company/job/FormFields';
import { ConfirmView } from '@/app/company/company/job/ConfirmView';

export default function JobNewPage() {
  const router = useRouter();
  
  // 各項目の状態
  const [group, setGroup] = useState('');
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [positionSummary, setPositionSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [otherRequirements, setOtherRequirements] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryNote, setSalaryNote] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [locationNote, setLocationNote] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [employmentTypeNote, setEmploymentTypeNote] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [overtime, setOvertime] = useState('');
  const [holidays, setHolidays] = useState('');
  const [selectionProcess, setSelectionProcess] = useState('');
  const [appealPoints, setAppealPoints] = useState<string[]>([]);
  const [smoke, setSmoke] = useState('');
  const [smokeNote, setSmokeNote] = useState('');
  const [resumeRequired, setResumeRequired] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [publicationType, setPublicationType] = useState('public');
  
  // モーダルの状態
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const [isJobTypeModalOpen, setJobTypeModalOpen] = useState(false);
  const [isIndustryModalOpen, setIndustryModalOpen] = useState(false);

  // 確認モードの状態
  const [isConfirmMode, setIsConfirmMode] = useState(false);

  // バリデーション状態
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  // 企業グループ情報を取得
  useEffect(() => {
    const fetchCompanyGroups = async () => {
      try {
        const token = localStorage.getItem('auth-token') || 
                     localStorage.getItem('auth_token') || 
                     localStorage.getItem('supabase-auth-token');
        
        console.log('Token found for groups API:', !!token);
        if (!token) {
          console.error('No authentication token found');
          return;
        }
        
        const response = await fetch('/api/company/groups', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Groups API response status:', response.status);
        const result = await response.json();
        console.log('Groups API result:', result);
        
        if (result.success) {
          setCompanyGroups(result.data);
          // ユーザーのグループが1つの場合は自動選択
          if (result.data.length === 1) {
            setGroup(result.data[0].id);
          }
        } else {
          console.error('Failed to fetch company groups:', result.error);
          alert(`グループ取得エラー: ${result.error}`);
        }
      } catch (error) {
        console.error('Error fetching company groups:', error);
        alert(`通信エラー: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    fetchCompanyGroups();
  }, []);

  // バリデーション関数
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!group) newErrors.group = 'グループを選択してください';
    if (!title.trim()) newErrors.title = '求人タイトルを入力してください';
    if (!jobDescription.trim()) newErrors.jobDescription = '仕事内容を入力してください';
    if (!employmentType) newErrors.employmentType = '雇用形態を選択してください';
    if (locations.length === 0) newErrors.locations = '勤務地を選択してください';
    if (jobTypes.length === 0) newErrors.jobTypes = '職種を選択してください';
    if (industries.length === 0) newErrors.industries = '業種を選択してください';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 確認モードに切り替え
  const handleConfirm = () => {
    if (validateForm()) {
      setIsConfirmMode(true);
      setShowErrors(false);
    } else {
      setShowErrors(true);
    }
  };

  // 編集モードに戻る
  const handleBack = () => {
    setIsConfirmMode(false);
    setShowErrors(false);
  };

  // 送信処理
  const handleSubmit = async () => {
    const data = {
      company_group_id: group,
      title: title || '未設定',
      job_type: jobTypes[0] || '未設定',
      industry: industries[0] || '未設定', 
      job_description: jobDescription || '未設定',
      required_skills: skills || '',
      preferred_skills: otherRequirements || '',
      salary_min: salaryMin ? parseInt(salaryMin) : null,
      salary_max: salaryMax ? parseInt(salaryMax) : null,
      employment_type: employmentType || '未設定',
      work_location: locations[0] || '未設定',
      remote_work_available: false,
      status: 'DRAFT',
      application_deadline: null,
      published_at: null
    };
    
    const token = localStorage.getItem('auth-token') || 
                 localStorage.getItem('auth_token') || 
                 localStorage.getItem('supabase-auth-token');
    
    try {
      const res = await fetch('/api/job/new', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      
      if (result.success) {
        // 完了ページにリダイレクト
        router.push('/company/job/complete');
      } else {
        console.error('API Error:', result);
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      console.error('Request Error:', error);
      alert('通信エラーが発生しました');
    }
  };

  return (
    <>
      <NewJobHeader />
      <div className="mx-[76px]">
        <div className="w-full my-[37px] p-[37px] rounded-[10px] bg-white">
          {isConfirmMode ? (
            <ConfirmView
              group={group}
              companyGroups={companyGroups}
              title={title}
              images={images}
              jobTypes={jobTypes}
              industries={industries}
              jobDescription={jobDescription}
              positionSummary={positionSummary}
              skills={skills}
              otherRequirements={otherRequirements}
              salaryMin={salaryMin}
              salaryMax={salaryMax}
              salaryNote={salaryNote}
              locations={locations}
              locationNote={locationNote}
              selectionProcess={selectionProcess}
              employmentType={employmentType}
              employmentTypeNote={employmentTypeNote}
              workingHours={workingHours}
              overtime={overtime}
              holidays={holidays}
              appealPoints={appealPoints}
              smoke={smoke}
              smokeNote={smokeNote}
              resumeRequired={resumeRequired}
              memo={memo}
              publicationType={publicationType}
              setPublicationType={setPublicationType}
            />
          ) : (
            <FormFields
              group={group}
              setGroup={setGroup}
              companyGroups={companyGroups}
              title={title}
              setTitle={setTitle}
              images={images}
              setImages={setImages}
              jobTypes={jobTypes}
              setJobTypes={setJobTypes}
              industries={industries}
              setIndustries={setIndustries}
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              positionSummary={positionSummary}
              setPositionSummary={setPositionSummary}
              skills={skills}
              setSkills={setSkills}
              otherRequirements={otherRequirements}
              setOtherRequirements={setOtherRequirements}
              salaryMin={salaryMin}
              setSalaryMin={setSalaryMin}
              salaryMax={salaryMax}
              setSalaryMax={setSalaryMax}
              salaryNote={salaryNote}
              setSalaryNote={setSalaryNote}
              locations={locations}
              setLocations={setLocations}
              locationNote={locationNote}
              setLocationNote={setLocationNote}
              selectionProcess={selectionProcess}
              setSelectionProcess={setSelectionProcess}
              employmentType={employmentType}
              setEmploymentType={setEmploymentType}
              employmentTypeNote={employmentTypeNote}
              setEmploymentTypeNote={setEmploymentTypeNote}
              workingHours={workingHours}
              setWorkingHours={setWorkingHours}
              overtime={overtime}
              setOvertime={setOvertime}
              holidays={holidays}
              setHolidays={setHolidays}
              appealPoints={appealPoints}
              setAppealPoints={setAppealPoints}
              smoke={smoke}
              setSmoke={setSmoke}
              smokeNote={smokeNote}
              setSmokeNote={setSmokeNote}
              resumeRequired={resumeRequired}
              setResumeRequired={setResumeRequired}
              memo={memo}
              setMemo={setMemo}
              setLocationModalOpen={setLocationModalOpen}
              setJobTypeModalOpen={setJobTypeModalOpen}
              setIndustryModalOpen={setIndustryModalOpen}
              errors={errors}
              showErrors={showErrors}
            />
          )}
        
          {/* ボタンエリア */}
          <div className="flex justify-center items-center gap-4 mt-[40px] w-full">
            {isConfirmMode ? (
              <>
                <Button
                  type="button"
                  variant="green-outline"
                  size="lg"
                  className="rounded-[32px] min-w-[260px] font-bold px-10 py-6.5 bg-white text-[#198D76] font-['Noto_Sans_JP']"
                  onClick={handleBack}
                >
                  修正する
                </Button>
                <button
                  type="button"
                  className="rounded-[32px] min-w-[160px] font-bold px-10 py-3.5 bg-gradient-to-r from-[#198D76] to-[#1CA74F] text-white"
                  onClick={handleSubmit}
                >
                  この内容で掲載申請をする
                </button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="green-outline"
                  size="lg"
                  className="rounded-[32px] min-w-[160px] font-bold px-10 py-6.5 bg-white text-[#198D76] font-['Noto_Sans_JP']"
                >
                  下書き保存
                </Button>
                <button
                  type="button"
                  className="rounded-[32px] min-w-[160px] font-bold px-10 py-3.5 bg-gradient-to-r from-[#198D76] to-[#1CA74F] text-white"
                  onClick={handleConfirm}
                >
                  確認する
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* モーダル */}
        {!isConfirmMode && (
          <>
            {isLocationModalOpen && (
              <Modal
                title="勤務地を選択"
                isOpen={isLocationModalOpen}
                onClose={() => setLocationModalOpen(false)}
                selectedCount={locations.length}
                totalCount={47}
                primaryButtonText="決定"
                onPrimaryAction={() => setLocationModalOpen(false)}
              >
                <LocationModal
                  selectedLocations={locations}
                  setSelectedLocations={setLocations}
                />
              </Modal>
            )}
            {isJobTypeModalOpen && (
              <Modal
                title="職種を選択"
                isOpen={isJobTypeModalOpen}
                onClose={() => setJobTypeModalOpen(false)}
                selectedCount={jobTypes.length}
                totalCount={3}
                primaryButtonText="決定"
                onPrimaryAction={() => setJobTypeModalOpen(false)}
              >
                <JobTypeModal
                  selectedJobTypes={jobTypes}
                  setSelectedJobTypes={setJobTypes}
                />
              </Modal>
            )}
            {isIndustryModalOpen && (
              <Modal
                title="業種を選択"
                isOpen={isIndustryModalOpen}
                onClose={() => setIndustryModalOpen(false)}
                selectedCount={industries.length}
                totalCount={3}
                primaryButtonText="決定"
                onPrimaryAction={() => setIndustryModalOpen(false)}
              >
                <IndustryModal 
                  selectedIndustries={industries} 
                  setSelectedIndustries={setIndustries} 
                />
              </Modal>
            )}
          </>
        )}
      </div>
    </>
  );
}

