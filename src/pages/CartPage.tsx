import { findProduct } from '../api/products';
import { money, navigate, RequireLogin } from '../components/common/Layout';
import { sessionActions, useSessionStore } from '../store/useSessionStore';

export function CartPage() {
  const { cart } = useSessionStore();

  // 1. 장바구니 아이템과 실제 상품 정보를 매칭
  const rows = cart
    .map((item, index) => ({
      item,
      index,
      product: findProduct(item.productId)!,
    }))
    .filter((row) => row.product);

  // 2. 전체 상품 금액 합계 계산 (누락되었던 곱하기 '*' 기호 복원)
  const total = rows.reduce(
    (sum, row) => sum + row.product.price * row.item.quantity,
    0
  );

  // 3. 주문 생성 및 결과 페이지 이동 함수
  const order = () => {
    const created = sessionActions.createOrder(total);
    navigate(`/demo-orders/${created.id}`);
  };

  // 4. 화면 렌더링
  return (
    <RequireLogin>
      <section className="section cart">
        <p className="eyebrow">CART</p>
        <h1>장바구니</h1>{rows.length ? (
          <>
            {/* 장바구니 상품 목록 */}
            <div className="cart-list">
              {rows.map(({ item, index, product }) => (
                <article
                  className="cart-row"
                  key={`${item.productId}-${item.color}-${item.size}`}
                >
                  <img src={product.imageUrl} alt="" />

                  <div>
                    <h2>{product.name}</h2>
                    <p>
                      {item.color} · {item.size}
                    </p>
                    <strong>{money(product.price)}</strong>
                  </div>

                  {/* 수량 조절 버튼 (누락되었던 빼기 '-' 기호 복원) */}
                  <div className="quantity">
                    <button
                      onClick={() =>
                        sessionActions.updateQuantity(index, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() =>
                        sessionActions.updateQuantity(index, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                  </div>

                  {/* 상품 삭제 버튼 */}
                  <button
                    className="text-button"
                    onClick={() => sessionActions.updateQuantity(index, 0)}
                  >
                    삭제
                  </button>
                </article>
              ))}
            </div>

            {/* 우측(또는 하단) 결제 요약 영역 */}
            <aside className="summary">
              <p>
                상품 합계 <strong>{money(total)}</strong>
              </p>
              <small>실제 결제와 배송은 발생하지 않습니다.</small>
              <button onClick={order}>체험 주문하기</button>
            </aside>
          </>
        ) : (
          /* 장바구니가 비어 있을 때 보여줄 화면 */
          <div className="empty">
            <h2>장바구니가 비어 있어요</h2>
            <button onClick={() => navigate('/products')}>
              상품 보러 가기
            </button>
          </div>
        )}
      </section>
    </RequireLogin>
  );
}
