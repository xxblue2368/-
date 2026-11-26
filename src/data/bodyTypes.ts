import type { BodyTypeOption } from '../api/onboarding';
import type { AuthUser } from '../types/api';

export type BodyGender = 'women' | 'men';

const legacyBodyShapes: Record<string, string> = {
  hourglass: 'female_hourglass',
  pear: 'female_triangle',
  inverted_triangle: 'female_inverted_triangle',
  rectangle: 'female_rectangle',
  apple: 'female_round',
};

export function normalizeBodyShape(shape: string | null | undefined): string | null {
  if (!shape) return null;
  return legacyBodyShapes[shape] ?? shape;
}

export function resolveBodyGender(user: AuthUser | null): BodyGender | '' {
  if (user?.gender === 'women' || user?.gender === 'men') return user.gender;
  const shape = normalizeBodyShape(user?.bodyProfile?.body_shape);
  if (shape?.startsWith('female_') || shape?.startsWith('women_')) return 'women';
  if (shape?.startsWith('male_') || shape?.startsWith('men_')) return 'men';
  return '';
}

export const BODY_TYPE_GUIDANCE: Record<BodyGender, string> = {
  men: '남성 실루엣 기준, 본인의 어깨·가슴·복부 비율과 가장 가까운 체형을 선택해 주세요.',
  women: '여성 실루엣 기준, 본인의 어깨·허리·골반 라인과 가장 가까운 체형을 선택해 주세요.',
};

export const BODY_TYPES: Record<BodyGender, BodyTypeOption[]> = {
  men: [
    {
      id: 'male_trapezoid',
      label: '트래피조이드 (역사다리꼴형)',
      engLabel: 'Trapezoid / Athletic',
      description: '어깨와 가슴이 적당히 넓고 허리선이 살짝 좁아지는 이상적인 밸런스 체형',
      imageUrl: '/images/body/male-1-trapezoid.png',
    },
    {
      id: 'male_triangle',
      label: '삼각형',
      engLabel: 'Triangle',
      description: '어깨보다 허리와 하체 라인이 상대적으로 발달해 안정감 있는 체형',
      imageUrl: '/images/body/male-2-triangle.png',
    },
    {
      id: 'male_inverted_triangle',
      label: '역삼각형',
      engLabel: 'Inverted Triangle',
      description: '어깨와 상체 근육이 넓게 발달하고 허리와 하체가 슬림한 체형',
      imageUrl: '/images/body/male-3-inverted-triangle.png',
    },
    {
      id: 'male_rectangle',
      label: '직사각형',
      engLabel: 'Rectangle',
      description: '어깨, 허리, 골반의 너비가 일직선에 가깝게 슬림하고 고른 체형',
      imageUrl: '/images/body/male-4-rectangle.png',
    },
    {
      id: 'male_oval',
      label: '오벌형 (복부 발달형)',
      engLabel: 'Oval / Apple',
      description: '상체 중심부와 복부에 볼륨감이 있어 여유로운 실루엣이 어울리는 체형',
      imageUrl: '/images/body/male-5-oval.png',
    },
  ],
  women: [
    {
      id: 'female_hourglass',
      label: '모래시계형',
      engLabel: 'Hourglass',
      description: '가슴과 골반 라인의 볼륨이 균형 잡혀 있고 허리가 잘록한 체형',
      imageUrl: '/images/body/female-1-hourglass.png',
    },
    {
      id: 'female_triangle',
      label: '삼각형 / 서양배형',
      engLabel: 'Triangle / Pear',
      description: '상체는 슬림하고 골반과 허벅지 라인에 볼륨감이 있는 체형',
      imageUrl: '/images/body/female-2-triangle.png',
    },
    {
      id: 'female_inverted_triangle',
      label: '역삼각형',
      engLabel: 'Inverted Triangle',
      description: '골반보다 어깨 라인이 넓고 시원하며 하체가 슬림한 체형',
      imageUrl: '/images/body/female-3-inverted-triangle.png',
    },
    {
      id: 'female_rectangle',
      label: '직선형',
      engLabel: 'Rectangle',
      description: '굴곡이 적고 어깨부터 허리, 골반까지 깔끔하게 일자로 떨어지는 모던한 체형',
      imageUrl: '/images/body/female-4-rectangle.png',
    },
    {
      id: 'female_round',
      label: '라운드형',
      engLabel: 'Round / Apple',
      description: '상체와 복부에 부드러운 볼륨감이 있고 다리 라인이 슬림한 체형',
      imageUrl: '/images/body/female-5-round.png',
    },
  ],
};
