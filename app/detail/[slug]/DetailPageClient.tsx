'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '../../types';
import {
    ArrowLeftIcon,
    BuildingOfficeIcon,
    ChatBubbleLeftEllipsisIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ClockIcon,
    DirectionsIcon,
    ExternalLinkIcon,
    GlobeIcon,
    PhoneIcon,
    QuestionMarkCircleIcon,
    UserIcon,
    WheelchairIcon,
    XCircleIcon,
    YenIcon
} from '../../components/Icons';
import { StarRating } from '../../components/StarRating';

interface DetailPageClientProps {
  facility: SearchResult;
}

export function DetailPageClient({ facility }: DetailPageClientProps) {
  const router = useRouter();
  const mapQuery = facility.address ? `${facility.title}, ${facility.address}` : facility.title;
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // カルーセル用の状態管理
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photoUrls = facility.photoUrls || [];
  const hasPhotos = photoUrls.length > 0;

  // 施設紹介文の状態管理
  const [description, setDescription] = useState<string | undefined>(facility.description);
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);

  // 営業時間の開閉状態
  const [isOpeningHoursExpanded, setIsOpeningHoursExpanded] = useState(false);

  // 施設紹介文の取得
  useEffect(() => {
    // 既にdescriptionがある場合はスキップ
    if (description || !facility.placeId) {
      return;
    }

    const fetchDescription = async () => {
      setIsLoadingDescription(true);
      try {
        const response = await fetch('/api/generate-description', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            placeId: facility.placeId,
            title: facility.title,
            address: facility.address,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setDescription(data.description);
        } else {
          console.error('Failed to fetch description:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching description:', error);
      } finally {
        setIsLoadingDescription(false);
      }
    };

    fetchDescription();
  }, [facility.placeId, description, facility.title, facility.address]);

  // 写真切り替え関数
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photoUrls.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length);
  };

  // 価格レベルを日本円に変換
  const getPriceRangeText = (priceLevel: number | undefined): string => {
    if (priceLevel === undefined) return '';

    switch (priceLevel) {
      case 1:
        return '¥300,000 - ¥600,000';
      case 2:
        return '¥600,000 - ¥1,200,000';
      case 3:
        return '¥1,200,000 - ¥2,000,000';
      case 4:
        return '¥2,000,000以上';
      default:
        return '';
    }
  };

  // 営業状況のテキストとスタイルを取得
  const getBusinessStatusInfo = (status: string | undefined) => {
    if (!status) return null;

    switch (status) {
      case 'OPERATIONAL':
        return {
          text: '営業中',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          icon: CheckCircleIcon
        };
      case 'CLOSED_TEMPORARILY':
        return {
          text: '一時休業中',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          icon: XCircleIcon
        };
      case 'CLOSED_PERMANENTLY':
        return {
          text: '閉業',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          icon: XCircleIcon
        };
      default:
        return null;
    }
  };

  // JSON-LD構造化データの生成(SEO最適化)
  const generateStructuredData = () => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sougifinder.vercel.app';

    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: facility.title,
      description: description || `${facility.title}の施設情報`,
      address: facility.address ? {
        '@type': 'PostalAddress',
        addressCountry: 'JP',
        addressLocality: facility.address,
      } : undefined,
      telephone: facility.phone,
      url: facility.website,
      aggregateRating: facility.rating ? {
        '@type': 'AggregateRating',
        ratingValue: facility.rating,
        reviewCount: facility.reviewCount || 0,
      } : undefined,
      image: facility.photoUrls?.[0] ? `${baseUrl}${facility.photoUrls[0]}` : undefined,
      priceRange: getPriceRangeText(facility.priceLevel),
    };
  };

  return (
    <>
      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateStructuredData()) }}
      />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-800 transition-colors duration-200"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>検索結果に戻る</span>
        </button>
      </div>

      <div className="p-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 leading-tight">
          {facility.title}
        </h2>
        {typeof facility.rating === 'number' && typeof facility.reviewCount === 'number' && facility.reviewCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <StarRating rating={facility.rating} />
            <span className="font-semibold text-slate-800">{facility.rating.toFixed(1)}</span>
            <span className="text-slate-500">({facility.reviewCount}件のレビュー)</span>
          </div>
        )}
      </div>

      {/* メインビジュアル: カルーセル or 地図 */}
      <div className="relative">
        <div className="aspect-w-16 aspect-h-9" style={{ height: '400px' }}>
          {hasPhotos ? (
            <img
              src={photoUrls[currentPhotoIndex]}
              alt={`${facility.title} - ${currentPhotoIndex + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                // 写真の読み込みに失敗した場合は地図にフォールバック
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const iframe = document.createElement('iframe');
                  iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=m&z=16&output=embed&iwloc=near${mapsApiKey ? `&key=${mapsApiKey}` : ''}`;
                  iframe.width = '100%';
                  iframe.height = '100%';
                  iframe.style.border = '0';
                  iframe.loading = 'lazy';
                  iframe.referrerPolicy = 'no-referrer-when-downgrade';
                  iframe.title = `Map of ${facility.title}`;
                  iframe.className = 'w-full h-full';
                  parent.appendChild(iframe);
                }
              }}
            />
          ) : (
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=m&z=16&output=embed&iwloc=near${mapsApiKey ? `&key=${mapsApiKey}` : ''}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map of ${facility.title}`}
              className="w-full h-full"
            ></iframe>
          )}
        </div>

        {/* 前後ボタンとインジケーター (2枚以上の場合のみ) */}
        {photoUrls.length > 1 && (
          <>
            {/* 前へボタン */}
            <button
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg"
              aria-label="前の写真"
            >
              <span className="text-xl">←</span>
            </button>

            {/* 次へボタン */}
            <button
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg"
              aria-label="次の写真"
            >
              <span className="text-xl">→</span>
            </button>

            {/* インジケーター */}
            <div className="absolute bottom-2 right-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {currentPhotoIndex + 1} / {photoUrls.length}
            </div>
          </>
        )}
      </div>

      {/* サムネイル一覧 (2枚以上の場合のみ) */}
      {photoUrls.length > 1 && (
        <div className="px-6 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photoUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`サムネイル ${index + 1}`}
                onClick={() => setCurrentPhotoIndex(index)}
                className={`w-20 h-16 object-cover cursor-pointer rounded flex-shrink-0 transition-all duration-200 ${
                  currentPhotoIndex === index
                    ? 'border-2 border-sky-600 shadow-md scale-105'
                    : 'border border-slate-300 hover:border-sky-400'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={facility.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors duration-200 px-4 py-3 rounded-lg shadow-sm"
          >
            <DirectionsIcon className="w-5 h-5" />
            <span>Googleマップで開く</span>
          </a>
          {facility.phone && (
            <a
              href={`tel:${facility.phone}`}
              className="flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors duration-200 px-4 py-3 rounded-lg"
            >
              <PhoneIcon className="w-5 h-5" />
              <span>電話をかける</span>
            </a>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">施設情報</h3>
          <ul className="space-y-4 text-slate-700">
            {facility.address && (
              <li className="flex items-start gap-4">
                <BuildingOfficeIcon className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold block">住所</span>
                  <p>{facility.address}</p>
                </div>
              </li>
            )}
            {facility.phone && (
              <li className="flex items-start gap-4">
                <PhoneIcon className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold block">電話番号</span>
                  <p className="text-sky-600 hover:underline">
                    <a href={`tel:${facility.phone}`}>{facility.phone}</a>
                  </p>
                </div>
              </li>
            )}

            {/* 営業時間 */}
            {facility.openingHours && (
              <li className="flex items-start gap-4">
                <ClockIcon className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                <div className="w-full">
                  <button
                    onClick={() => setIsOpeningHoursExpanded(!isOpeningHoursExpanded)}
                    className="w-full flex items-center justify-between gap-2 text-left hover:bg-slate-50 -m-1 p-1 rounded transition-colors duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">営業時間</span>
                      {facility.openingHours.open_now !== undefined && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          facility.openingHours.open_now
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {facility.openingHours.open_now ? '営業中' : '営業時間外'}
                        </span>
                      )}
                    </div>
                    <ChevronDownIcon
                      className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                        isOpeningHoursExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpeningHoursExpanded && (
                    <div className="mt-2">
                      {facility.openingHours.weekday_text && facility.openingHours.weekday_text.length > 0 ? (
                        <div className="space-y-1 text-sm">
                          {facility.openingHours.weekday_text.map((dayText, index) => (
                            <p key={index} className="text-slate-600">{dayText}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">営業時間の詳細情報はありません</p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )}

            {/* ウェブサイト */}
            {facility.website && (
              <li className="flex items-start gap-4">
                <GlobeIcon className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold block">公式ウェブサイト</span>
                  <a
                    href={facility.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center gap-1 text-sm"
                  >
                    詳細を見る
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                </div>
              </li>
            )}

            {/* 営業状況 */}
            {facility.businessStatus && getBusinessStatusInfo(facility.businessStatus) && (
              <li className="flex items-start gap-4">
                {(() => {
                  const statusInfo = getBusinessStatusInfo(facility.businessStatus);
                  if (!statusInfo) return null;
                  const StatusIcon = statusInfo.icon;
                  return (
                    <>
                      <StatusIcon className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                      <div>
                        <span className="font-semibold block">営業状況</span>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                          {statusInfo.text}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </li>
            )}

            {/* バリアフリー対応 */}
            {facility.wheelchairAccessible && (
              <li className="flex items-start gap-4">
                <WheelchairIcon className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold block">バリアフリー対応</span>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-slate-600">車椅子でのアクセス可能</span>
                  </div>
                </div>
              </li>
            )}

            {/* 価格帯 */}
            {facility.priceLevel !== undefined && getPriceRangeText(facility.priceLevel) && (
              <li className="flex items-start gap-4">
                <YenIcon className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold block">目安価格帯</span>
                  <p className="text-slate-600 font-medium">{getPriceRangeText(facility.priceLevel)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    ※Google Mapsの情報に基づく概算です。詳細は施設にお問い合わせください。
                  </p>
                </div>
              </li>
            )}
          </ul>
        </div>
        
        {/* 利用者の声 Section */}
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-slate-500" />
            利用者の声
          </h3>
          {facility.detailedReviews && facility.detailedReviews.length > 0 ? (
            <div className="space-y-4">
              {facility.detailedReviews.map((review, index) => (
                <div key={index} className="p-4 border-l-4 border-slate-200 bg-slate-50 rounded-r-lg">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{review.author_name}</span>
                    <StarRating rating={review.rating} />
                    <span className="text-sm text-slate-500">
                      {new Date(review.time * 1000).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{review.text}</p>
                </div>
              ))}
            </div>
          ) : facility.reviews && facility.reviews.length > 0 ? (
            <div className="space-y-4">
              {facility.reviews.map((review, index) => (
                <blockquote key={index} className="p-4 border-l-4 border-slate-200 bg-slate-50 text-slate-700 rounded-r-lg">
                  <p className="italic">「{review}」</p>
                </blockquote>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 text-slate-500 rounded-lg text-sm">
              <p>代表的な口コミ情報はありませんでした。</p>
            </div>
          )}
          <a
            href={facility.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors duration-200 px-4 py-2 rounded-lg w-full border border-sky-200 hover:border-sky-300"
          >
            <ExternalLinkIcon className="w-4 h-4" />
            <span>Googleマップで全ての口コミを見る</span>
          </a>
        </div>

        {/* 施設について Section */}
        {(description || isLoadingDescription) && (
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BuildingOfficeIcon className="w-6 h-6 text-slate-500" />
              施設について
            </h3>
            {isLoadingDescription ? (
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
              </div>
            ) : (
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* よくある質問 Section */}
        {/* <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <QuestionMarkCircleIcon className="w-6 h-6 text-slate-500" />
            よくある質問
          </h3>
          {facility.qanda && facility.qanda.length > 0 ? (
            <dl className="space-y-4">
              {facility.qanda.map((item, index) => (
                <div key={index} className="bg-slate-50 p-4 rounded-lg">
                  <dt className="font-semibold text-slate-800 flex items-start gap-2">
                    <span className="font-bold text-sky-600">Q.</span>
                    <span>{item.question}</span>
                  </dt>
                  <dd className="mt-2 text-slate-700 flex items-start gap-2">
                    <span className="font-bold text-slate-500">A.</span>
                    <span>{item.answer}</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg text-sm">
              <p className="text-slate-700 mb-3">
                よくある質問の情報は見つかりませんでした。
              </p>
              <p className="text-slate-600 mb-3 text-xs">
                この施設に関する詳しい情報やQ&Aは、Googleマップのビジネスプロフィールでご確認いただけます。
              </p>
              <a
                href={facility.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors"
              >
                <ExternalLinkIcon className="w-4 h-4" />
                <span>Googleマップで全情報を確認</span>
              </a>
            </div>
          )}
        </div> */}

        {/* オーナー情報 Section */}
        {facility.ownerInfo && (facility.ownerInfo.message || (facility.ownerInfo.posts && facility.ownerInfo.posts.length > 0)) && (
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-slate-500" />
              オーナー情報
            </h3>
            <div className="space-y-4">
              {/* オーナーからのメッセージ */}
              {facility.ownerInfo.message && (
                <div className="bg-gradient-to-r from-sky-50 to-blue-50 p-4 rounded-lg border border-sky-200">
                  <p className="text-sm font-semibold text-sky-700 mb-2">メッセージ</p>
                  <p className="text-slate-800 whitespace-pre-wrap">{facility.ownerInfo.message}</p>
                </div>
              )}

              {/* オーナーからの投稿 */}
              {facility.ownerInfo.posts && facility.ownerInfo.posts.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">オーナーからの投稿</p>
                  <div className="space-y-3">
                    {facility.ownerInfo.posts.map((post, index) => (
                      <div key={index} className="bg-slate-50 p-4 rounded-md border border-slate-200">
                        <p className="text-slate-800 text-sm whitespace-pre-wrap">{post}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
    </>
  );
};