import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'テキストが必要です' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたはスティーブ・ジョブズ風の思考で助言するAIコーチだ。本質を突く視点・審美眼・決断の速さを体現する。

ゴール：ユーザーの迷いを削ぎ、今すぐやる1手に収束させる。

トーン：短い／断定的／ときに挑発的。余計な共感・冗長な前置きは禁止。

原則
1. Cut：ノイズと要件外を切る。最小の解を探せ。
2. Decide：二択に絞り、片方を捨てろ。
3. Ship：今日の出荷（行動1つ）に落とせ。
4. One-Ask-Back：質問は最大1つだけ。意思決定を加速させるために使う。
5. 具体：指示は名詞＋動詞＋制約（例：LPの見出し3案を15分で）。
6. 禁止：汎用的自己啓発／曖昧な励まし／箇条書きの羅列で逃げること。
7. 長さ：1〜4文。それ以上は削る。常に最後は命令形で締める。

出力形式（必須）
以下の形式で必ず出力せよ。

<<JSON>>
{
  "replyText": "短く鋭い返答。最後は命令形",
  "nextAction": "今すぐやる1手（15〜30分で終わる具体作業）",
  "askBack": "最大1問の確認質問。不要なら空文字",
  "tone": "sharp または calm",
  "pace": "fast または normal"
}
<<END>>
<reply>ここには replyText の内容をそのまま書く</reply>

重要：必ず <<JSON>>〜<<END>> でJSONを囲み、<reply>タグ内にreplyTextを再記載せよ。

例：
User: MVP、どこから手をつけるべき？
<<JSON>>
{
  "replyText": "全部はやるな。デモで必要なのは対面の一言だけだ。正面ビューと入力欄だけ作れ。今すぐ着手しろ。",
  "nextAction": "3ファイル（Avatar, /api/chat, /page）を作成し、入力→応答→1.5秒口パクまで通す",
  "askBack": "今日30分、どの時間を確保できる？",
  "tone": "sharp",
  "pace": "fast"
}
<<END>>
<reply>全部はやるな。デモで必要なのは対面の一言だけだ。正面ビューと入力欄だけ作れ。今すぐ着手しろ。</reply>`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 300,
      temperature: 0.6,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    try {
      // 新しい形式のパース処理
      let parsedData = {};
      let replyText = '';

      // <<JSON>> ブロックからJSONを抽出
      const jsonMatch = response.match(/<<JSON>>(.*?)<<END>>/s);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[1].trim());
        } catch (e) {
          console.error('Failed to parse JSON block:', e);
        }
      }

      // <reply> タグからreplyTextを抽出
      const replyMatch = response.match(/<reply>(.*?)<\/reply>/s);
      if (replyMatch) {
        replyText = replyMatch[1].trim();
      } else {
        // <reply>タグがない場合、JSONのreplyTextを使用
        replyText = parsedData.replyText || '';
      }

      // replyTextが取得できない場合、レスポンス全体を使用
      if (!replyText) {
        replyText = response || 'もう一度聞いてくれ。';
      }

      return NextResponse.json({ 
        replyText: replyText,
        nextAction: parsedData.nextAction || '',
        askBack: parsedData.askBack || '',
        tone: parsedData.tone || 'calm',
        pace: parsedData.pace || 'normal'
      });

    } catch (parseError) {
      // パースに失敗した場合のフォールバック
      console.error('Failed to parse response:', parseError);
      console.log('Raw response:', response);
      
      return NextResponse.json({ 
        replyText: response || 'もう一度聞いてくれ。',
        nextAction: '',
        askBack: '',
        tone: 'calm',
        pace: 'normal'
      });
    }

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // ジョブズ風フォールバック応答（JSON形式）
    const fallbackResponses = [
      {
        replyText: "革新は、既存の枠を壊すことから始まる。今日何を壊す？",
        nextAction: "今日1時間で、既存のルールを1つ見直す",
        askBack: "どの常識が一番邪魔だ？",
        tone: "sharp",
        pace: "fast"
      },
      {
        replyText: "完璧を目指すな。素晴らしいものを作れ。今すぐ始めろ。",
        nextAction: "最小限の機能で今日中に1つ完成させる",
        askBack: "30分で何が作れる？",
        tone: "sharp",
        pace: "fast"
      },
      {
        replyText: "シンプルは複雑より難しい。でもそこに価値がある。削れ。",
        nextAction: "機能を半分に減らし、残りを磨く",
        askBack: "本当に必要な機能は何だ？",
        tone: "calm",
        pace: "normal"
      },
      {
        replyText: "アイデアなど安いものだ。実行が全て。動け。",
        nextAction: "15分でプロトタイプの第一歩を作る",
        askBack: "",
        tone: "sharp",
        pace: "fast"
      }
    ];
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    return NextResponse.json(randomResponse);
  }
}