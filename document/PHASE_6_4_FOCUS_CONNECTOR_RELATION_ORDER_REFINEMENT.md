# Family Bloom — Phase 6.4 Focus Connector + Relation Order Refinement

## Mục tiêu

- Loại bỏ cảm giác line focus có đoạn đậm/nhạt do active/faded connector vẽ chồng theo thứ tự không ổn định.
- Khi focus, tăng độ dày đường active thêm đúng 1 đơn vị để dễ nhìn hơn.
- Sắp xếp tab Quan hệ của Person Detail theo thứ tự: Cha/Mẹ → Vợ/Chồng → Anh/Chị/Em → Con cái.

## Cách xử lý connector

Renderer dùng hai pass:

1. vẽ toàn bộ connector faded/inactive;
2. vẽ toàn bộ connector active/focus lên trên.

Union/shared-child cũng tách child active/inactive theo pass, nên một nhánh mờ không thể phủ lên đoạn chung đang focus.

## Độ dày

- normal active: 1.7
- focus active: 2.7
- faded: 1.05

Partner dashed line cũng tăng 1 đơn vị khi nằm trong nhánh focus.

## Data safety

Không đổi schema, Rules, Functions, DG-11, Query/Kinship, Spatial Grid hay dữ liệu persisted.
