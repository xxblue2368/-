export type TermsCode = 'OVER_14' | 'SERVICE_TERMS' | 'PRIVACY_COLLECTION' | 'AI_MODEL_TRAIN' | 'MARKETING_OPT_IN';

export type AgreementPayload = {
  termsCode: TermsCode;
  version: '1.0';
  agreed: boolean;
};

export type TermContent = {
  code: TermsCode;
  label: string;
  required: boolean;
  modalTitle?: string;
  sections?: { heading: string; paragraphs: string[] }[];
};

export const PRIVACY_SUMMARY = [
  { heading: '수집 목적', body: '회원 식별, 계정 관리, 서비스 제공 및 문의 대응' },
  { heading: '수집 항목', body: '이메일, 이름, 비밀번호(암호화 저장)' },
  { heading: '보유 기간', body: '회원 탈퇴 시까지. 관계 법령에 따라 보존이 필요한 정보는 해당 기간 동안 별도 보관' },
];

export const TERMS_DATA: TermContent[] = [
  {
    code: 'OVER_14',
    label: '만 14세 이상입니다.',
    required: true,
  },
  {
    code: 'SERVICE_TERMS',
    label: '서비스 이용약관에 동의합니다.',
    required: true,
    modalTitle: '서비스 이용약관',
    sections: [
      { heading: '제1조 목적', paragraphs: ['이 약관은 개인화 패션 서비스가 제공하는 상품 탐색, 찜, 취향 설정 및 추천 기능의 이용 조건과 회원과 서비스 운영자의 권리·의무를 정합니다.'] },
      { heading: '제2조 회원 계정', paragraphs: ['회원은 정확한 정보를 제공하고 계정 정보를 안전하게 관리해야 합니다. 계정 사용 중 문제가 발생하면 서비스 운영자에게 알려야 합니다.', '회원은 타인의 정보를 이용하거나 서비스 운영을 방해하는 방식으로 서비스를 이용할 수 없습니다.'] },
      { heading: '제3조 서비스 이용', paragraphs: ['서비스는 상품 정보 조회, 찜 목록, 회원이 선택한 취향 정보에 기반한 추천 기능을 제공합니다. 기능과 상품 정보는 운영상 필요에 따라 변경될 수 있습니다.', '상품의 가격, 재고 및 판매 조건은 연결된 상품 정보와 판매처의 안내를 따릅니다. 현재 화면의 체험 주문 기능은 실제 결제나 배송을 발생시키지 않습니다.'] },
      { heading: '제4조 이용 제한 및 탈퇴', paragraphs: ['회원은 서비스 내 설정 또는 운영자에게 요청하여 계정을 탈퇴할 수 있습니다. 법령상 보존 의무가 있는 정보는 해당 기간 동안 분리 보관될 수 있습니다.', '운영자는 법령 위반, 타인 권리 침해 또는 서비스의 안정적인 운영을 해치는 이용을 제한할 수 있습니다.'] },
      { heading: '제5조 약관 변경 및 문의', paragraphs: ['운영자는 약관을 변경하는 경우 적용일과 변경 내용을 서비스 화면에 안내합니다. 회원은 서비스 내 고객 문의 경로를 통해 이용 관련 문의를 할 수 있습니다.'] },
    ],
  },
  {
    code: 'PRIVACY_COLLECTION',
    label: '개인정보 수집 및 이용에 동의합니다.',
    required: true,
    modalTitle: '개인정보 수집 및 이용 동의',
    sections: [
      { heading: '수집·이용 목적', paragraphs: ['회원 식별과 계정 관리, 로그인 및 서비스 제공, 공지 전달, 고객 문의 대응을 위해 개인정보를 이용합니다.'] },
      { heading: '수집 항목', paragraphs: ['필수 항목: 이메일 주소, 이름, 비밀번호(원문이 아닌 해시 형태로 저장).', '키·몸무게·체형 정보와 스타일 선택 정보는 별도 선택 동의를 한 경우에만 수집·이용합니다.'] },
      { heading: '보유 및 이용 기간', paragraphs: ['개인정보는 회원 탈퇴 시까지 보유·이용합니다. 다만 관계 법령에 따라 보존해야 하는 정보는 법정 보존 기간 동안 다른 정보와 분리하여 보관합니다.'] },
      { heading: '동의 거부 권리', paragraphs: ['회원은 개인정보 수집·이용에 동의하지 않을 수 있습니다. 필수 항목에 동의하지 않으면 회원가입 및 회원 기능 이용이 제한됩니다. 선택 정보는 동의하지 않아도 기본 서비스를 이용할 수 있습니다.'] },
    ],
  },
  {
    code: 'AI_MODEL_TRAIN',
    label: 'AI 스타일 추천 고도화를 위한 데이터 활용에 동의합니다.',
    required: false,
    modalTitle: 'AI 스타일 추천 고도화를 위한 데이터 활용 동의',
    sections: [
      { heading: '이용 목적', paragraphs: ['회원이 선택한 스타일 카드와 서비스 내 상품 반응 정보를 분석하여 스타일 분류와 개인화 추천 기능을 개선합니다.'] },
      { heading: '이용 항목 및 기간', paragraphs: ['스타일 선택 정보와 서비스 내 상품 반응 정보를 이용합니다. 동의 철회 또는 회원 탈퇴 시까지 이용하며, 법령상 보존이 필요한 정보는 별도 보관합니다.'] },
      { heading: '선택 동의', paragraphs: ['이 동의는 선택 사항이며, 동의하지 않아도 회원가입과 기본 상품 탐색 기능을 이용할 수 있습니다. 동의 여부는 설정에서 변경할 수 있습니다.'] },
    ],
  },
  {
    code: 'MARKETING_OPT_IN',
    label: '맞춤형 스타일 업데이트 및 이벤트 광고성 정보 수신에 동의합니다.',
    required: false,
    modalTitle: '광고성 정보 수신 동의',
    sections: [
      { heading: '발송 내용 및 방법', paragraphs: ['신상품, 스타일 콘텐츠, 혜택 및 이벤트 소식을 이메일 등 서비스가 제공하는 연락 수단으로 안내할 수 있습니다.'] },
      { heading: '이용 항목 및 기간', paragraphs: ['이메일 주소와 회원이 선택한 스타일 정보를 이용합니다. 동의 철회 또는 회원 탈퇴 시까지 발송 목적으로 이용합니다.'] },
      { heading: '철회 및 거부', paragraphs: ['이 동의는 선택 사항입니다. 동의하지 않아도 서비스 이용에 제한이 없으며, 수신한 안내의 수신거부 방법 또는 계정 설정에서 언제든 철회할 수 있습니다.'] },
    ],
  },
];

export const REQUIRED_TERMS: TermsCode[] = ['OVER_14', 'SERVICE_TERMS', 'PRIVACY_COLLECTION'];

export const createEmptyAgreements = (): AgreementPayload[] => TERMS_DATA.map(({ code }) => ({
  termsCode: code,
  version: '1.0',
  agreed: false,
}));
