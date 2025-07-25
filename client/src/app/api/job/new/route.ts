import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/database/supabase';
import { SessionService } from '@/lib/server/core/services/SessionService';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Job Creation API Started ===');
    
    // セッションからユーザーID取得
    const sessionService = new SessionService();
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('supabase-auth-token')?.value;
    const token = authHeader?.replace('Bearer ', '') || cookieToken;
    console.log('Auth token found:', !!token);
    
    if (!token) {
      console.log('No auth token provided');
      return NextResponse.json({ success: false, error: '認証トークンがありません' }, { status: 401 });
    }
    
    console.log('Validating session...');
    const sessionResult = await sessionService.validateSession(token);
    if (!sessionResult.success || !sessionResult.sessionInfo) {
      console.log('Session validation failed:', sessionResult.error);
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });
    }
    const createdBy = sessionResult.sessionInfo.user.id;
    console.log('User authenticated:', createdBy);

    // 企業ユーザーのcompany_account_idを取得
    const supabase = getSupabaseAdminClient();
    
    // セッション認証のユーザーIDとcompany_usersのIDは異なるため、メールアドレスで検索
    console.log('Searching user by email:', sessionResult.sessionInfo.user.email);
    const { data: userByEmail, error: emailError } = await supabase
      .from('company_users')
      .select('id, company_account_id, email, full_name')
      .eq('email', sessionResult.sessionInfo.user.email)
      .single();
    
    if (emailError || !userByEmail) {
      console.log('Failed to get user by email:', emailError);
      return NextResponse.json({ success: false, error: '企業アカウント情報の取得に失敗しました' }, { status: 400 });
    }
    
    console.log('Found user by email:', userByEmail);
    const actualUserId = userByEmail.id; // これが実際のcompany_usersのID
    const userCompanyAccountId = userByEmail.company_account_id;
    console.log('Actual user ID from company_users:', actualUserId);
    console.log('User company_account_id:', userCompanyAccountId);

    // company_group_idは求人作成時にフロントエンドから指定される
    // 指定されない場合はnullにする（後で管理画面で設定可能）
    console.log('Company group handling: Will use company_account_id for filtering');

    const body = await request.json();
    console.log('Request body received:', body);
    // job_postingsテーブルのカラムに完全準拠
    const {
      company_group_id: bodyCompanyGroupId, // リクエストボディからのcompany_group_id（もしあれば）
      title,
      job_description,
      required_skills,
      preferred_skills,
      salary_min,
      salary_max,
      employment_type,
      work_location,
      remote_work_available,
      job_type,
      industry,
      status,
      application_deadline,
      published_at,
    } = body;

    // 雇用形態の日本語→英語マッピング
    const employmentTypeMapping: Record<string, string> = {
      '正社員': 'FULL_TIME',
      '契約社員': 'CONTRACT',
      '派遣社員': 'CONTRACT', // 契約社員として扱う
      'アルバイト・パート': 'PART_TIME',
      '業務委託': 'CONTRACT', // 契約社員として扱う
      'インターン': 'INTERN'
    };
    
    const mappedEmploymentType = employmentTypeMapping[employment_type] || 'FULL_TIME';

    // 下書き保存のため必須チェックを一時的に無効化
    // if (!company_group_id || !title || !job_description || !employment_type || !work_location || !job_type || !industry) {
    //   return NextResponse.json({ success: false, error: '必須項目が不足しています' }, { status: 400 });
    // }

    // デバッグ：利用可能なcompany_user_idを確認
    console.log('=== DEBUG INFO ===');
    console.log('createdBy (session user ID):', createdBy);
    console.log('actualUserId (company_users ID):', actualUserId);
    console.log('bodyCompanyGroupId from request:', bodyCompanyGroupId);
    console.log('userCompanyAccountId:', userCompanyAccountId);
    
    // 現在のcompany_account_idに属するcompany_usersを確認
    const { data: availableUsers, error: usersError } = await supabase
      .from('company_users')
      .select('id, email, full_name')
      .eq('company_account_id', userCompanyAccountId);
    
    console.log('Available company_users for this account:', availableUsers);
    console.log('Users query error:', usersError);
    
    // company_group_idとして使用するIDを決定
    let finalCompanyGroupId = actualUserId; // デフォルトは実際のcompany_usersのID
    
    // bodyCompanyGroupIdが指定されており、利用可能なユーザーIDの中にある場合はそれを使用
    if (bodyCompanyGroupId && availableUsers?.some(user => user.id === bodyCompanyGroupId)) {
      finalCompanyGroupId = bodyCompanyGroupId;
      console.log('Using bodyCompanyGroupId:', finalCompanyGroupId);
    } else {
      console.log('Using actualUserId as fallback:', finalCompanyGroupId);
    }
    
    const insertData = {
      company_account_id: userCompanyAccountId, // 重要: company_account_idを追加
      company_group_id: finalCompanyGroupId, // 検証済みのcompany_user_idを使用
      title: title || '未設定',
      job_description: job_description || '未設定',
      required_skills: Array.isArray(required_skills) ? required_skills : (required_skills ? [required_skills] : []),
      preferred_skills: Array.isArray(preferred_skills) ? preferred_skills : (preferred_skills ? [preferred_skills] : []),
      salary_min: salary_min !== undefined ? Number(salary_min) : null,
      salary_max: salary_max !== undefined ? Number(salary_max) : null,
      employment_type: mappedEmploymentType,
      work_location: work_location || '未設定',
      remote_work_available: remote_work_available === true || remote_work_available === 'true',
      job_type: job_type || '未設定',
      industry: industry || '未設定',
      status: status || 'DRAFT',
      application_deadline: application_deadline || null,
      published_at: published_at || null,
      // created_at, updated_atはDB側で自動
    };
    
    console.log('Data to insert into Supabase:', insertData);
    
    const { data, error } = await supabase.from('job_postings').insert([insertData]);
    
    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    console.log('Job created successfully:', data);
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error('Job creation API error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
