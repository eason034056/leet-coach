import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  // 從 URL 參數中取得授權碼和其他參數
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (code) {
    const cookieStore = await cookies();
    
    // 建立 Supabase 客戶端，並正確設置 cookies 處理
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // 處理在 Server Action 中設置 cookie 的錯誤
            }
          },
          remove(name: string, options: Record<string, unknown>) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch {
              // 處理在 Server Action 中移除 cookie 的錯誤
            }
          },
        },
      }
    );

    // 使用授權碼來交換會話
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // 如果發生錯誤，重定向到登入頁面並顯示錯誤訊息
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  // 驗證成功後重定向到首頁
  return NextResponse.redirect(`${origin}/`);
}
