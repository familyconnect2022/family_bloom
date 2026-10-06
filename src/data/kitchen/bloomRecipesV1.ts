import type { BloomRecipe } from "@/types/homeLiving";

/**
 * Family Bloom Recipe Seed V1 — 100 món.
 * Nội dung Bloom tự biên soạn để dùng offline; không sao chép văn bản/ảnh từ website bên ngoài.
 * Nutrition định lượng chưa được xác minh nên V1 chỉ dùng preference candidate tags, không đưa ra tuyên bố y khoa.
 */
export const BLOOM_RECIPES_V1: BloomRecipe[] = [
  {
    "id": "bloom-v1-001-ca-kho-tieu",
    "nameVi": "Cá kho tiêu",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 30,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cá",
        "amount": "600 g"
      },
      {
        "name": "tiêu",
        "amount": "1/2 thìa cà phê"
      },
      {
        "name": "nước mắm",
        "amount": "2 thìa canh"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế cá; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp cá với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi cá chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "lowerSugarCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-002-ca-kho-nghe",
    "nameVi": "Cá kho nghệ",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 30,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cá",
        "amount": "600 g"
      },
      {
        "name": "nghệ",
        "amount": "vừa đủ"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      },
      {
        "name": "nước mắm",
        "amount": "2 thìa canh"
      }
    ],
    "steps": [
      "Sơ chế cá; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp cá với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi cá chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "lowerSugarCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-003-ca-thu-kho-ca-chua",
    "nameVi": "Cá thu kho cà chua",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 35,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cá thu",
        "amount": "600 g"
      },
      {
        "name": "cà chua",
        "amount": "4 quả"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế cá thu; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp cá thu với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi cá thu chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-004-ca-nuc-kho-thom",
    "nameVi": "Cá nục kho thơm",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "cá nục",
        "amount": "600 g"
      },
      {
        "name": "thơm",
        "amount": "1/2 quả"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      },
      {
        "name": "tiêu",
        "amount": "1/2 thìa cà phê"
      }
    ],
    "steps": [
      "Sơ chế cá nục; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp cá nục với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi cá nục chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-005-thit-kho-trung",
    "nameVi": "Thịt kho trứng",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 50,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "thịt heo",
        "amount": "450 g"
      },
      {
        "name": "trứng",
        "amount": "4 quả"
      },
      {
        "name": "nước dừa",
        "amount": "400 ml"
      }
    ],
    "steps": [
      "Sơ chế thịt heo; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp thịt heo với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi thịt heo chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-006-thit-ba-chi-kho-tieu",
    "nameVi": "Thịt ba chỉ kho tiêu",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 35,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "ba chỉ",
        "amount": "450 g"
      },
      {
        "name": "tiêu",
        "amount": "1/2 thìa cà phê"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế ba chỉ; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp ba chỉ với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi ba chỉ chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-007-thit-nac-rim-man-ngot",
    "nameVi": "Thịt nạc rim mặn ngọt",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 25,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "thịt nạc",
        "amount": "450 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      },
      {
        "name": "nước mắm",
        "amount": "2 thìa canh"
      }
    ],
    "steps": [
      "Sơ chế thịt nạc; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp thịt nạc với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi thịt nạc chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-008-ga-kho-gung",
    "nameVi": "Gà kho gừng",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 30,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "gừng",
        "amount": "20 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế thịt gà; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp thịt gà với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi thịt gà chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "lowerSugarCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-009-ga-kho-sa",
    "nameVi": "Gà kho sả",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 30,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "sả",
        "amount": "3 cây"
      },
      {
        "name": "ớt",
        "amount": "1 quả"
      }
    ],
    "steps": [
      "Sơ chế thịt gà; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp thịt gà với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi thịt gà chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-010-suon-rim-nuoc-mam",
    "nameVi": "Sườn rim nước mắm",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "sườn heo",
        "amount": "600 g"
      },
      {
        "name": "tỏi",
        "amount": "3 tép"
      },
      {
        "name": "nước mắm",
        "amount": "2 thìa canh"
      }
    ],
    "steps": [
      "Sơ chế sườn heo; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp sườn heo với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi sườn heo chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-011-tom-rim-thit",
    "nameVi": "Tôm rim thịt",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 30,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "tôm",
        "amount": "350 g"
      },
      {
        "name": "thịt heo",
        "amount": "450 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế tôm; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp tôm với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi tôm chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-012-tom-rim-tieu",
    "nameVi": "Tôm rim tiêu",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "tôm",
        "amount": "350 g"
      },
      {
        "name": "tiêu",
        "amount": "1/2 thìa cà phê"
      },
      {
        "name": "tỏi",
        "amount": "3 tép"
      }
    ],
    "steps": [
      "Sơ chế tôm; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp tôm với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi tôm chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-013-dau-hu-kho-nam",
    "nameVi": "Đậu hũ kho nấm",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 25,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "đậu hũ",
        "amount": "400 g"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế đậu hũ; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp đậu hũ với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi đậu hũ chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "vegetarian",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-014-nam-kho-tieu",
    "nameVi": "Nấm kho tiêu",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "tiêu",
        "amount": "1/2 thìa cà phê"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế nấm; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp nấm với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi nấm chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "vegetarian",
      "controlledCarbCandidate"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-015-trung-kho-nuoc-tuong",
    "nameVi": "Trứng kho nước tương",
    "summary": "Món đậm vị kiểu cơm nhà, phù hợp ăn cùng cơm và rau.",
    "category": "Kho / rim",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "trứng",
        "amount": "4 quả"
      },
      {
        "name": "nước tương",
        "amount": "2 thìa canh"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế trứng; hành, tỏi/gừng/sả nếu có thì băm hoặc cắt lát.",
      "Ướp trứng với gia vị vừa ăn khoảng 10–15 phút; ưu tiên nêm nhạt rồi điều chỉnh sau.",
      "Cho nguyên liệu vào nồi, thêm một ít nước hoặc nước dừa tùy món; đun sôi rồi hạ lửa nhỏ.",
      "Kho 20–35 phút đến khi trứng chín, nước kho sánh và thấm; nếm lại trước khi tắt bếp."
    ],
    "preferenceTags": [
      "vegetarian"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-016-canh-chua-ca",
    "nameVi": "Canh chua cá",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 25,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "cá",
        "amount": "600 g"
      },
      {
        "name": "cà chua",
        "amount": "4 quả"
      },
      {
        "name": "thơm",
        "amount": "1/2 quả"
      },
      {
        "name": "giá",
        "amount": "250 g"
      },
      {
        "name": "me",
        "amount": "30 g"
      }
    ],
    "steps": [
      "Sơ chế cá, cà chua, thơm, giá; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "lowerSodiumCandidate",
      "family",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-017-canh-rau-ngot-thit-bam",
    "nameVi": "Canh rau ngót thịt băm",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "rau ngót",
        "amount": "300 g"
      },
      {
        "name": "thịt băm",
        "amount": "350 g"
      }
    ],
    "steps": [
      "Sơ chế rau ngót, thịt băm; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "lowerSodiumCandidate",
      "family",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-018-canh-bi-do-thit-bam",
    "nameVi": "Canh bí đỏ thịt băm",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bí đỏ",
        "amount": "500 g"
      },
      {
        "name": "thịt băm",
        "amount": "350 g"
      }
    ],
    "steps": [
      "Sơ chế bí đỏ, thịt băm; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-019-canh-bi-xanh-nau-tom",
    "nameVi": "Canh bí xanh nấu tôm",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bí xanh",
        "amount": "500 g"
      },
      {
        "name": "tôm",
        "amount": "350 g"
      }
    ],
    "steps": [
      "Sơ chế bí xanh, tôm; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "lowerSodiumCandidate",
      "family",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-020-canh-cai-xanh-thit-bam",
    "nameVi": "Canh cải xanh thịt băm",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cải xanh",
        "amount": "350 g"
      },
      {
        "name": "thịt băm",
        "amount": "350 g"
      },
      {
        "name": "gừng",
        "amount": "20 g"
      }
    ],
    "steps": [
      "Sơ chế cải xanh, thịt băm, gừng; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "lowerSodiumCandidate",
      "family",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-021-canh-mong-toi-muop",
    "nameVi": "Canh mồng tơi mướp",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "mồng tơi",
        "amount": "300 g"
      },
      {
        "name": "mướp",
        "amount": "400 g"
      }
    ],
    "steps": [
      "Sơ chế mồng tơi, mướp; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-022-canh-cua-rau-day",
    "nameVi": "Canh cua rau đay",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 25,
    "cookMinutes": 20,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "cua đồng",
        "amount": "400 g"
      },
      {
        "name": "rau đay",
        "amount": "250 g"
      },
      {
        "name": "mồng tơi",
        "amount": "300 g"
      }
    ],
    "steps": [
      "Sơ chế cua đồng, rau đay, mồng tơi; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-023-canh-kho-qua-nhoi-thit",
    "nameVi": "Canh khổ qua nhồi thịt",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 25,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "khổ qua",
        "amount": "500 g"
      },
      {
        "name": "thịt băm",
        "amount": "350 g"
      },
      {
        "name": "nấm mèo",
        "amount": "30 g"
      }
    ],
    "steps": [
      "Sơ chế khổ qua, thịt băm, nấm mèo; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "lowerSugarCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-024-canh-cai-thao-cuon-thit",
    "nameVi": "Canh cải thảo cuộn thịt",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 25,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "cải thảo",
        "amount": "500 g"
      },
      {
        "name": "thịt băm",
        "amount": "350 g"
      }
    ],
    "steps": [
      "Sơ chế cải thảo, thịt băm; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "lowerSodiumCandidate",
      "family",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-025-canh-rong-bien-dau-hu",
    "nameVi": "Canh rong biển đậu hũ",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "rong biển",
        "amount": "15 g"
      },
      {
        "name": "đậu hũ",
        "amount": "400 g"
      }
    ],
    "steps": [
      "Sơ chế rong biển, đậu hũ; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-026-canh-nam-rau-cu",
    "nameVi": "Canh nấm rau củ",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "cà rốt",
        "amount": "2 củ"
      },
      {
        "name": "bắp non",
        "amount": "150 g"
      },
      {
        "name": "súp lơ",
        "amount": "vừa đủ"
      }
    ],
    "steps": [
      "Sơ chế nấm, cà rốt, bắp non, súp lơ; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-027-canh-ca-chua-trung",
    "nameVi": "Canh cà chua trứng",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 12,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cà chua",
        "amount": "4 quả"
      },
      {
        "name": "trứng",
        "amount": "4 quả"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế cà chua, trứng, hành; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-028-canh-khoai-mo-thit-bam",
    "nameVi": "Canh khoai mỡ thịt băm",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "khoai mỡ",
        "amount": "500 g"
      },
      {
        "name": "thịt băm",
        "amount": "350 g"
      }
    ],
    "steps": [
      "Sơ chế khoai mỡ, thịt băm; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-029-canh-bau-nau-tom",
    "nameVi": "Canh bầu nấu tôm",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bầu",
        "amount": "500 g"
      },
      {
        "name": "tôm",
        "amount": "350 g"
      }
    ],
    "steps": [
      "Sơ chế bầu, tôm; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "lowerSodiumCandidate",
      "family",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-030-canh-chua-chay",
    "nameVi": "Canh chua chay",
    "summary": "Món canh gia đình dễ kết hợp với cơm và món mặn.",
    "category": "Canh",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "đậu hũ",
        "amount": "400 g"
      },
      {
        "name": "cà chua",
        "amount": "4 quả"
      },
      {
        "name": "thơm",
        "amount": "1/2 quả"
      },
      {
        "name": "me",
        "amount": "30 g"
      }
    ],
    "steps": [
      "Sơ chế đậu hũ, cà chua, thơm, me; cắt các nguyên liệu thành miếng vừa ăn.",
      "Đun khoảng 1–1,2 lít nước; cho nguyên liệu lâu chín hoặc phần đạm vào trước.",
      "Khi nước sôi trở lại, cho rau/củ vào và nấu vừa chín để giữ màu và độ ngọt.",
      "Nêm nhẹ theo khẩu vị gia đình, thêm hành/rau thơm nếu phù hợp rồi tắt bếp."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-031-rau-muong-xao-toi",
    "nameVi": "Rau muống xào tỏi",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 10,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "rau muống",
        "amount": "400 g"
      },
      {
        "name": "tỏi",
        "amount": "3 tép"
      }
    ],
    "steps": [
      "Sơ chế rau muống, tỏi, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-032-bap-cai-xao-thit-bam",
    "nameVi": "Bắp cải xào thịt băm",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bắp cải",
        "amount": "500 g"
      },
      {
        "name": "thịt băm",
        "amount": "350 g"
      }
    ],
    "steps": [
      "Sơ chế bắp cải, thịt băm, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "family",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-033-su-su-xao-trung",
    "nameVi": "Su su xào trứng",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "su su",
        "amount": "vừa đủ"
      },
      {
        "name": "trứng",
        "amount": "4 quả"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế su su, trứng, hành, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-034-dau-que-xao-thit-bo",
    "nameVi": "Đậu que xào thịt bò",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "đậu que",
        "amount": "300 g"
      },
      {
        "name": "thịt bò",
        "amount": "400 g"
      },
      {
        "name": "tỏi",
        "amount": "3 tép"
      }
    ],
    "steps": [
      "Sơ chế đậu que, thịt bò, tỏi, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-035-bong-cai-xanh-xao-bo",
    "nameVi": "Bông cải xanh xào bò",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bông cải xanh",
        "amount": "350 g"
      },
      {
        "name": "thịt bò",
        "amount": "400 g"
      }
    ],
    "steps": [
      "Sơ chế bông cải xanh, thịt bò, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-036-cai-thia-xao-nam",
    "nameVi": "Cải thìa xào nấm",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 12,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cải thìa",
        "amount": "350 g"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "tỏi",
        "amount": "3 tép"
      }
    ],
    "steps": [
      "Sơ chế cải thìa, nấm, tỏi, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-037-muop-xao-trung",
    "nameVi": "Mướp xào trứng",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 12,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "mướp",
        "amount": "400 g"
      },
      {
        "name": "trứng",
        "amount": "4 quả"
      }
    ],
    "steps": [
      "Sơ chế mướp, trứng, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-038-gia-he-xao-dau-hu",
    "nameVi": "Giá hẹ xào đậu hũ",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 12,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "giá",
        "amount": "250 g"
      },
      {
        "name": "hẹ",
        "amount": "100 g"
      },
      {
        "name": "đậu hũ",
        "amount": "400 g"
      }
    ],
    "steps": [
      "Sơ chế giá, hẹ, đậu hũ, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-039-thit-bo-xao-hanh-tay",
    "nameVi": "Thịt bò xào hành tây",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "thịt bò",
        "amount": "400 g"
      },
      {
        "name": "hành tây",
        "amount": "1 củ"
      }
    ],
    "steps": [
      "Sơ chế thịt bò, hành tây, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-040-ga-xao-sa-ot",
    "nameVi": "Gà xào sả ớt",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "sả",
        "amount": "3 cây"
      },
      {
        "name": "ớt",
        "amount": "1 quả"
      }
    ],
    "steps": [
      "Sơ chế thịt gà, sả, ớt, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-041-muc-xao-can-tay",
    "nameVi": "Mực xào cần tây",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 15,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "mực",
        "amount": "400 g"
      },
      {
        "name": "cần tây",
        "amount": "100 g"
      },
      {
        "name": "hành tây",
        "amount": "1 củ"
      }
    ],
    "steps": [
      "Sơ chế mực, cần tây, hành tây, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-042-tom-xao-rau-cu",
    "nameVi": "Tôm xào rau củ",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "tôm",
        "amount": "350 g"
      },
      {
        "name": "súp lơ",
        "amount": "vừa đủ"
      },
      {
        "name": "cà rốt",
        "amount": "2 củ"
      },
      {
        "name": "đậu Hà Lan",
        "amount": "150 g"
      }
    ],
    "steps": [
      "Sơ chế tôm, súp lơ, cà rốt, đậu Hà Lan, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "lowerSodiumCandidate",
      "family",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-043-nam-dui-ga-xao-sa",
    "nameVi": "Nấm đùi gà xào sả",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "nấm đùi gà",
        "amount": "300 g"
      },
      {
        "name": "sả",
        "amount": "3 cây"
      }
    ],
    "steps": [
      "Sơ chế nấm đùi gà, sả, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "vegetarian",
      "controlledCarbCandidate",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-044-cai-chua-xao-trung",
    "nameVi": "Cải chua xào trứng",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 12,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cải chua",
        "amount": "250 g"
      },
      {
        "name": "trứng",
        "amount": "4 quả"
      }
    ],
    "steps": [
      "Sơ chế cải chua, trứng, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-045-mien-xao-rau-cu",
    "nameVi": "Miến xào rau củ",
    "summary": "Món xào nhanh, phù hợp bữa trưa hoặc bữa tối.",
    "category": "Xào",
    "mealTypes": [
      "sang",
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "miến",
        "amount": "250 g"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "cà rốt",
        "amount": "2 củ"
      },
      {
        "name": "cải",
        "amount": "350 g"
      }
    ],
    "steps": [
      "Sơ chế miến, nấm, cà rốt, cải, để nguyên liệu thật ráo trước khi xào.",
      "Làm nóng chảo, dùng lượng dầu vừa phải; phi thơm tỏi/hành nếu món có dùng.",
      "Cho nguyên liệu lâu chín vào trước, đảo lửa vừa đến lớn; thêm rau sau để rau không bị nhũn.",
      "Nêm vừa ăn, đảo thêm 1–2 phút rồi tắt bếp khi nguyên liệu vừa chín."
    ],
    "preferenceTags": [
      "vegetarian"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-046-ga-hap-gung",
    "nameVi": "Gà hấp gừng",
    "summary": "Cách chế biến đơn giản, giữ vị nguyên liệu và dễ phối bữa.",
    "category": "Hấp / luộc",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "gừng",
        "amount": "20 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế thịt gà, gừng, hành; để ráo và xếp phần nguyên liệu chính vào nồi hấp/luộc.",
      "Đun nước sôi trước; nếu hấp có thể lót gừng hoặc sả để tăng mùi thơm.",
      "Làm chín đến khi phần đạm chín hoàn toàn hoặc rau vừa mềm; tránh nấu quá lâu.",
      "Dùng nóng với rau ăn kèm; nước chấm để riêng để mỗi người tự điều chỉnh độ mặn."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "lowerSodiumCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-047-ga-hap-sa",
    "nameVi": "Gà hấp sả",
    "summary": "Cách chế biến đơn giản, giữ vị nguyên liệu và dễ phối bữa.",
    "category": "Hấp / luộc",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "sả",
        "amount": "3 cây"
      }
    ],
    "steps": [
      "Sơ chế thịt gà, sả; để ráo và xếp phần nguyên liệu chính vào nồi hấp/luộc.",
      "Đun nước sôi trước; nếu hấp có thể lót gừng hoặc sả để tăng mùi thơm.",
      "Làm chín đến khi phần đạm chín hoàn toàn hoặc rau vừa mềm; tránh nấu quá lâu.",
      "Dùng nóng với rau ăn kèm; nước chấm để riêng để mỗi người tự điều chỉnh độ mặn."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "lowerSodiumCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-048-ca-hap-hanh-gung",
    "nameVi": "Cá hấp hành gừng",
    "summary": "Cách chế biến đơn giản, giữ vị nguyên liệu và dễ phối bữa.",
    "category": "Hấp / luộc",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 25,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "cá",
        "amount": "600 g"
      },
      {
        "name": "gừng",
        "amount": "20 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế cá, gừng, hành; để ráo và xếp phần nguyên liệu chính vào nồi hấp/luộc.",
      "Đun nước sôi trước; nếu hấp có thể lót gừng hoặc sả để tăng mùi thơm.",
      "Làm chín đến khi phần đạm chín hoàn toàn hoặc rau vừa mềm; tránh nấu quá lâu.",
      "Dùng nóng với rau ăn kèm; nước chấm để riêng để mỗi người tự điều chỉnh độ mặn."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "lowerSodiumCandidate",
      "family",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-049-ca-hap-rau-cu",
    "nameVi": "Cá hấp rau củ",
    "summary": "Cách chế biến đơn giản, giữ vị nguyên liệu và dễ phối bữa.",
    "category": "Hấp / luộc",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 25,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "cá",
        "amount": "600 g"
      },
      {
        "name": "cà rốt",
        "amount": "2 củ"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế cá, cà rốt, nấm, hành; để ráo và xếp phần nguyên liệu chính vào nồi hấp/luộc.",
      "Đun nước sôi trước; nếu hấp có thể lót gừng hoặc sả để tăng mùi thơm.",
      "Làm chín đến khi phần đạm chín hoàn toàn hoặc rau vừa mềm; tránh nấu quá lâu.",
      "Dùng nóng với rau ăn kèm; nước chấm để riêng để mỗi người tự điều chỉnh độ mặn."
    ],
    "preferenceTags": [
      "lowerSodiumCandidate",
      "family",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-050-tom-hap-sa",
    "nameVi": "Tôm hấp sả",
    "summary": "Cách chế biến đơn giản, giữ vị nguyên liệu và dễ phối bữa.",
    "category": "Hấp / luộc",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 12,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "tôm",
        "amount": "350 g"
      },
      {
        "name": "sả",
        "amount": "3 cây"
      }
    ],
    "steps": [
      "Sơ chế tôm, sả; để ráo và xếp phần nguyên liệu chính vào nồi hấp/luộc.",
      "Đun nước sôi trước; nếu hấp có thể lót gừng hoặc sả để tăng mùi thơm.",
      "Làm chín đến khi phần đạm chín hoàn toàn hoặc rau vừa mềm; tránh nấu quá lâu.",
      "Dùng nóng với rau ăn kèm; nước chấm để riêng để mỗi người tự điều chỉnh độ mặn."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "lowerSodiumCandidate",
      "family",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-051-thit-luoc-cuon-rau",
    "nameVi": "Thịt luộc cuốn rau",
    "summary": "Cách chế biến đơn giản, giữ vị nguyên liệu và dễ phối bữa.",
    "category": "Hấp / luộc",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 25,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "thịt heo",
        "amount": "450 g"
      },
      {
        "name": "rau sống",
        "amount": "250 g"
      },
      {
        "name": "dưa leo",
        "amount": "2 quả"
      }
    ],
    "steps": [
      "Sơ chế thịt heo, rau sống, dưa leo; để ráo và xếp phần nguyên liệu chính vào nồi hấp/luộc.",
      "Đun nước sôi trước; nếu hấp có thể lót gừng hoặc sả để tăng mùi thơm.",
      "Làm chín đến khi phần đạm chín hoàn toàn hoặc rau vừa mềm; tránh nấu quá lâu.",
      "Dùng nóng với rau ăn kèm; nước chấm để riêng để mỗi người tự điều chỉnh độ mặn."
    ],
    "preferenceTags": [
      "lowerSodiumCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-052-rau-cu-luoc-thap-cam",
    "nameVi": "Rau củ luộc thập cẩm",
    "summary": "Cách chế biến đơn giản, giữ vị nguyên liệu và dễ phối bữa.",
    "category": "Hấp / luộc",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 12,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bông cải",
        "amount": "350 g"
      },
      {
        "name": "cà rốt",
        "amount": "2 củ"
      },
      {
        "name": "đậu que",
        "amount": "300 g"
      }
    ],
    "steps": [
      "Sơ chế bông cải, cà rốt, đậu que; để ráo và xếp phần nguyên liệu chính vào nồi hấp/luộc.",
      "Đun nước sôi trước; nếu hấp có thể lót gừng hoặc sả để tăng mùi thơm.",
      "Làm chín đến khi phần đạm chín hoàn toàn hoặc rau vừa mềm; tránh nấu quá lâu.",
      "Dùng nóng với rau ăn kèm; nước chấm để riêng để mỗi người tự điều chỉnh độ mặn."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-053-dau-bap-luoc",
    "nameVi": "Đậu bắp luộc",
    "summary": "Cách chế biến đơn giản, giữ vị nguyên liệu và dễ phối bữa.",
    "category": "Hấp / luộc",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 5,
    "cookMinutes": 8,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "đậu bắp",
        "amount": "300 g"
      }
    ],
    "steps": [
      "Sơ chế đậu bắp; để ráo và xếp phần nguyên liệu chính vào nồi hấp/luộc.",
      "Đun nước sôi trước; nếu hấp có thể lót gừng hoặc sả để tăng mùi thơm.",
      "Làm chín đến khi phần đạm chín hoàn toàn hoặc rau vừa mềm; tránh nấu quá lâu.",
      "Dùng nóng với rau ăn kèm; nước chấm để riêng để mỗi người tự điều chỉnh độ mặn."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-054-trung-hap-thit",
    "nameVi": "Trứng hấp thịt",
    "summary": "Cách chế biến đơn giản, giữ vị nguyên liệu và dễ phối bữa.",
    "category": "Hấp / luộc",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "trứng",
        "amount": "4 quả"
      },
      {
        "name": "thịt băm",
        "amount": "350 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế trứng, thịt băm, hành; để ráo và xếp phần nguyên liệu chính vào nồi hấp/luộc.",
      "Đun nước sôi trước; nếu hấp có thể lót gừng hoặc sả để tăng mùi thơm.",
      "Làm chín đến khi phần đạm chín hoàn toàn hoặc rau vừa mềm; tránh nấu quá lâu.",
      "Dùng nóng với rau ăn kèm; nước chấm để riêng để mỗi người tự điều chỉnh độ mặn."
    ],
    "preferenceTags": [
      "lowerSodiumCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-055-dau-hu-hap-nam",
    "nameVi": "Đậu hũ hấp nấm",
    "summary": "Cách chế biến đơn giản, giữ vị nguyên liệu và dễ phối bữa.",
    "category": "Hấp / luộc",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "đậu hũ",
        "amount": "400 g"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế đậu hũ, nấm, hành; để ráo và xếp phần nguyên liệu chính vào nồi hấp/luộc.",
      "Đun nước sôi trước; nếu hấp có thể lót gừng hoặc sả để tăng mùi thơm.",
      "Làm chín đến khi phần đạm chín hoàn toàn hoặc rau vừa mềm; tránh nấu quá lâu.",
      "Dùng nóng với rau ăn kèm; nước chấm để riêng để mỗi người tự điều chỉnh độ mặn."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-056-ca-nuong-giay-bac",
    "nameVi": "Cá nướng giấy bạc",
    "summary": "Món đổi vị cho bữa gia đình, ưu tiên cách làm gọn và dễ thực hiện.",
    "category": "Chiên / nướng",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 30,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "cá",
        "amount": "600 g"
      },
      {
        "name": "sả",
        "amount": "3 cây"
      },
      {
        "name": "gừng",
        "amount": "20 g"
      },
      {
        "name": "rau thơm",
        "amount": "80 g"
      }
    ],
    "steps": [
      "Sơ chế cá, sả, gừng, rau thơm; ướp phần nguyên liệu chính khoảng 15–20 phút nếu cần.",
      "Làm nóng chảo, lò hoặc nồi chiên trước khi cho nguyên liệu vào.",
      "Chiên/nướng đến khi bề mặt vàng và phần bên trong chín hoàn toàn; trở mặt để chín đều.",
      "Để ráo bớt dầu nếu có và dùng cùng rau/canh để bữa ăn cân bằng hơn."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-057-ca-thu-ap-chao",
    "nameVi": "Cá thu áp chảo",
    "summary": "Món đổi vị cho bữa gia đình, ưu tiên cách làm gọn và dễ thực hiện.",
    "category": "Chiên / nướng",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cá thu",
        "amount": "600 g"
      },
      {
        "name": "tiêu",
        "amount": "1/2 thìa cà phê"
      },
      {
        "name": "tỏi",
        "amount": "3 tép"
      }
    ],
    "steps": [
      "Sơ chế cá thu, tiêu, tỏi; ướp phần nguyên liệu chính khoảng 15–20 phút nếu cần.",
      "Làm nóng chảo, lò hoặc nồi chiên trước khi cho nguyên liệu vào.",
      "Chiên/nướng đến khi bề mặt vàng và phần bên trong chín hoàn toàn; trở mặt để chín đều.",
      "Để ráo bớt dầu nếu có và dùng cùng rau/canh để bữa ăn cân bằng hơn."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "family",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-058-ga-nuong-mat-ong",
    "nameVi": "Gà nướng mật ong",
    "summary": "Món đổi vị cho bữa gia đình, ưu tiên cách làm gọn và dễ thực hiện.",
    "category": "Chiên / nướng",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "mật ong",
        "amount": "1 thìa canh"
      },
      {
        "name": "tỏi",
        "amount": "3 tép"
      }
    ],
    "steps": [
      "Sơ chế thịt gà, mật ong, tỏi; ướp phần nguyên liệu chính khoảng 15–20 phút nếu cần.",
      "Làm nóng chảo, lò hoặc nồi chiên trước khi cho nguyên liệu vào.",
      "Chiên/nướng đến khi bề mặt vàng và phần bên trong chín hoàn toàn; trở mặt để chín đều.",
      "Để ráo bớt dầu nếu có và dùng cùng rau/canh để bữa ăn cân bằng hơn."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-059-ga-nuong-sa",
    "nameVi": "Gà nướng sả",
    "summary": "Món đổi vị cho bữa gia đình, ưu tiên cách làm gọn và dễ thực hiện.",
    "category": "Chiên / nướng",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "sả",
        "amount": "3 cây"
      },
      {
        "name": "tỏi",
        "amount": "3 tép"
      }
    ],
    "steps": [
      "Sơ chế thịt gà, sả, tỏi; ướp phần nguyên liệu chính khoảng 15–20 phút nếu cần.",
      "Làm nóng chảo, lò hoặc nồi chiên trước khi cho nguyên liệu vào.",
      "Chiên/nướng đến khi bề mặt vàng và phần bên trong chín hoàn toàn; trở mặt để chín đều.",
      "Để ráo bớt dầu nếu có và dùng cùng rau/canh để bữa ăn cân bằng hơn."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-060-suon-nuong-ngu-vi",
    "nameVi": "Sườn nướng ngũ vị",
    "summary": "Món đổi vị cho bữa gia đình, ưu tiên cách làm gọn và dễ thực hiện.",
    "category": "Chiên / nướng",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 25,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "sườn heo",
        "amount": "600 g"
      },
      {
        "name": "ngũ vị hương",
        "amount": "1/2 thìa cà phê"
      },
      {
        "name": "tỏi",
        "amount": "3 tép"
      }
    ],
    "steps": [
      "Sơ chế sườn heo, ngũ vị hương, tỏi; ướp phần nguyên liệu chính khoảng 15–20 phút nếu cần.",
      "Làm nóng chảo, lò hoặc nồi chiên trước khi cho nguyên liệu vào.",
      "Chiên/nướng đến khi bề mặt vàng và phần bên trong chín hoàn toàn; trở mặt để chín đều.",
      "Để ráo bớt dầu nếu có và dùng cùng rau/canh để bữa ăn cân bằng hơn."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-061-dau-hu-chien-sa",
    "nameVi": "Đậu hũ chiên sả",
    "summary": "Món đổi vị cho bữa gia đình, ưu tiên cách làm gọn và dễ thực hiện.",
    "category": "Chiên / nướng",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "đậu hũ",
        "amount": "400 g"
      },
      {
        "name": "sả",
        "amount": "3 cây"
      }
    ],
    "steps": [
      "Sơ chế đậu hũ, sả; ướp phần nguyên liệu chính khoảng 15–20 phút nếu cần.",
      "Làm nóng chảo, lò hoặc nồi chiên trước khi cho nguyên liệu vào.",
      "Chiên/nướng đến khi bề mặt vàng và phần bên trong chín hoàn toàn; trở mặt để chín đều.",
      "Để ráo bớt dầu nếu có và dùng cùng rau/canh để bữa ăn cân bằng hơn."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-062-cha-ca-thi-la-ap-chao",
    "nameVi": "Chả cá thì là áp chảo",
    "summary": "Món đổi vị cho bữa gia đình, ưu tiên cách làm gọn và dễ thực hiện.",
    "category": "Chiên / nướng",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 20,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "cá",
        "amount": "600 g"
      },
      {
        "name": "thì là",
        "amount": "30 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế cá, thì là, hành; ướp phần nguyên liệu chính khoảng 15–20 phút nếu cần.",
      "Làm nóng chảo, lò hoặc nồi chiên trước khi cho nguyên liệu vào.",
      "Chiên/nướng đến khi bề mặt vàng và phần bên trong chín hoàn toàn; trở mặt để chín đều.",
      "Để ráo bớt dầu nếu có và dùng cùng rau/canh để bữa ăn cân bằng hơn."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-063-trung-chien-rau-cu",
    "nameVi": "Trứng chiên rau củ",
    "summary": "Món đổi vị cho bữa gia đình, ưu tiên cách làm gọn và dễ thực hiện.",
    "category": "Chiên / nướng",
    "mealTypes": [
      "sang",
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 12,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "trứng",
        "amount": "4 quả"
      },
      {
        "name": "cà rốt",
        "amount": "2 củ"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      },
      {
        "name": "bắp",
        "amount": "2 trái"
      }
    ],
    "steps": [
      "Sơ chế trứng, cà rốt, hành, bắp; ướp phần nguyên liệu chính khoảng 15–20 phút nếu cần.",
      "Làm nóng chảo, lò hoặc nồi chiên trước khi cho nguyên liệu vào.",
      "Chiên/nướng đến khi bề mặt vàng và phần bên trong chín hoàn toàn; trở mặt để chín đều.",
      "Để ráo bớt dầu nếu có và dùng cùng rau/canh để bữa ăn cân bằng hơn."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-064-nam-nuong-giay-bac",
    "nameVi": "Nấm nướng giấy bạc",
    "summary": "Món đổi vị cho bữa gia đình, ưu tiên cách làm gọn và dễ thực hiện.",
    "category": "Chiên / nướng",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      },
      {
        "name": "tiêu",
        "amount": "1/2 thìa cà phê"
      }
    ],
    "steps": [
      "Sơ chế nấm, hành, tiêu; ướp phần nguyên liệu chính khoảng 15–20 phút nếu cần.",
      "Làm nóng chảo, lò hoặc nồi chiên trước khi cho nguyên liệu vào.",
      "Chiên/nướng đến khi bề mặt vàng và phần bên trong chín hoàn toàn; trở mặt để chín đều.",
      "Để ráo bớt dầu nếu có và dùng cùng rau/canh để bữa ăn cân bằng hơn."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-065-khoai-lang-nuong",
    "nameVi": "Khoai lang nướng",
    "summary": "Món đổi vị cho bữa gia đình, ưu tiên cách làm gọn và dễ thực hiện.",
    "category": "Chiên / nướng",
    "mealTypes": [
      "sang",
      "an_nhe"
    ],
    "servings": 4,
    "prepMinutes": 5,
    "cookMinutes": 30,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "khoai lang",
        "amount": "500 g"
      }
    ],
    "steps": [
      "Sơ chế khoai lang; ướp phần nguyên liệu chính khoảng 15–20 phút nếu cần.",
      "Làm nóng chảo, lò hoặc nồi chiên trước khi cho nguyên liệu vào.",
      "Chiên/nướng đến khi bề mặt vàng và phần bên trong chín hoàn toàn; trở mặt để chín đều.",
      "Để ráo bớt dầu nếu có và dùng cùng rau/canh để bữa ăn cân bằng hơn."
    ],
    "preferenceTags": [
      "vegetarian"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-066-pho-bo",
    "nameVi": "Phở bò",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "trua"
    ],
    "servings": 4,
    "prepMinutes": 30,
    "cookMinutes": 60,
    "difficulty": "Khá",
    "ingredients": [
      {
        "name": "bánh phở",
        "amount": "500 g"
      },
      {
        "name": "thịt bò",
        "amount": "400 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      },
      {
        "name": "rau thơm",
        "amount": "80 g"
      }
    ],
    "steps": [
      "Sơ chế bánh phở, thịt bò, hành, rau thơm; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-067-pho-ga",
    "nameVi": "Phở gà",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "trua"
    ],
    "servings": 4,
    "prepMinutes": 25,
    "cookMinutes": 50,
    "difficulty": "Khá",
    "ingredients": [
      {
        "name": "bánh phở",
        "amount": "500 g"
      },
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      },
      {
        "name": "rau thơm",
        "amount": "80 g"
      }
    ],
    "steps": [
      "Sơ chế bánh phở, thịt gà, hành, rau thơm; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-068-bun-bo-nam-bo",
    "nameVi": "Bún bò Nam Bộ",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 25,
    "cookMinutes": 25,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "bún",
        "amount": "500 g"
      },
      {
        "name": "thịt bò",
        "amount": "400 g"
      },
      {
        "name": "rau sống",
        "amount": "250 g"
      },
      {
        "name": "đậu phộng",
        "amount": "50 g"
      }
    ],
    "steps": [
      "Sơ chế bún, thịt bò, rau sống, đậu phộng; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-069-bun-thit-nuong",
    "nameVi": "Bún thịt nướng",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 30,
    "cookMinutes": 30,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "bún",
        "amount": "500 g"
      },
      {
        "name": "thịt heo",
        "amount": "450 g"
      },
      {
        "name": "rau sống",
        "amount": "250 g"
      }
    ],
    "steps": [
      "Sơ chế bún, thịt heo, rau sống; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-070-bun-ca",
    "nameVi": "Bún cá",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "trua"
    ],
    "servings": 4,
    "prepMinutes": 25,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "bún",
        "amount": "500 g"
      },
      {
        "name": "cá",
        "amount": "600 g"
      },
      {
        "name": "cà chua",
        "amount": "4 quả"
      },
      {
        "name": "rau thơm",
        "amount": "80 g"
      }
    ],
    "steps": [
      "Sơ chế bún, cá, cà chua, rau thơm; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-071-bun-rieu-cua",
    "nameVi": "Bún riêu cua",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "trua"
    ],
    "servings": 4,
    "prepMinutes": 35,
    "cookMinutes": 45,
    "difficulty": "Khá",
    "ingredients": [
      {
        "name": "bún",
        "amount": "500 g"
      },
      {
        "name": "cua",
        "amount": "400 g"
      },
      {
        "name": "cà chua",
        "amount": "4 quả"
      },
      {
        "name": "đậu hũ",
        "amount": "400 g"
      }
    ],
    "steps": [
      "Sơ chế bún, cua, cà chua, đậu hũ; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-072-mien-ga",
    "nameVi": "Miến gà",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 30,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "miến",
        "amount": "250 g"
      },
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế miến, thịt gà, nấm, hành; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-073-mien-nam-chay",
    "nameVi": "Miến nấm chay",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 25,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "miến",
        "amount": "250 g"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "đậu hũ",
        "amount": "400 g"
      }
    ],
    "steps": [
      "Sơ chế miến, nấm, đậu hũ; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-074-chao-ga",
    "nameVi": "Cháo gà",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 45,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "gạo",
        "amount": "200 g"
      },
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "gừng",
        "amount": "20 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế gạo, thịt gà, gừng, hành; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-075-chao-thit-bam",
    "nameVi": "Cháo thịt băm",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 35,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "gạo",
        "amount": "200 g"
      },
      {
        "name": "thịt băm",
        "amount": "350 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế gạo, thịt băm, hành; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-076-chao-ca",
    "nameVi": "Cháo cá",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 40,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "gạo",
        "amount": "200 g"
      },
      {
        "name": "cá",
        "amount": "600 g"
      },
      {
        "name": "gừng",
        "amount": "20 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế gạo, cá, gừng, hành; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-077-chao-nam-chay",
    "nameVi": "Cháo nấm chay",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 35,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "gạo",
        "amount": "200 g"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "cà rốt",
        "amount": "2 củ"
      }
    ],
    "steps": [
      "Sơ chế gạo, nấm, cà rốt; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "vegetarian"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-078-mi-quang-ga",
    "nameVi": "Mì quảng gà",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 30,
    "cookMinutes": 40,
    "difficulty": "Khá",
    "ingredients": [
      {
        "name": "mì quảng",
        "amount": "500 g"
      },
      {
        "name": "thịt gà",
        "amount": "700 g"
      },
      {
        "name": "rau sống",
        "amount": "250 g"
      },
      {
        "name": "đậu phộng",
        "amount": "50 g"
      }
    ],
    "steps": [
      "Sơ chế mì quảng, thịt gà, rau sống, đậu phộng; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-079-hu-tieu-thit-bam",
    "nameVi": "Hủ tiếu thịt băm",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "trua"
    ],
    "servings": 4,
    "prepMinutes": 25,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "hủ tiếu",
        "amount": "500 g"
      },
      {
        "name": "thịt băm",
        "amount": "350 g"
      },
      {
        "name": "giá",
        "amount": "250 g"
      },
      {
        "name": "hẹ",
        "amount": "100 g"
      }
    ],
    "steps": [
      "Sơ chế hủ tiếu, thịt băm, giá, hẹ; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-080-banh-canh-ca",
    "nameVi": "Bánh canh cá",
    "summary": "Món nước hoặc món sợi quen thuộc, phù hợp đổi bữa.",
    "category": "Bún / phở / cháo / mì",
    "mealTypes": [
      "sang",
      "trua"
    ],
    "servings": 4,
    "prepMinutes": 25,
    "cookMinutes": 35,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "bánh canh",
        "amount": "500 g"
      },
      {
        "name": "cá",
        "amount": "600 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế bánh canh, cá, hành; chuẩn bị phần sợi/gạo và rau ăn kèm.",
      "Nấu nước dùng hoặc phần cháo nền; hớt bọt để nước trong và nêm từ nhạt đến vừa.",
      "Làm chín phần đạm/topping, đồng thời trụng sợi hoặc nấu cháo đến độ mềm mong muốn.",
      "Cho ra tô, thêm rau thơm/rau ăn kèm và dùng nóng; gia vị để riêng để dễ điều chỉnh."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-081-dau-hu-sot-ca-chua",
    "nameVi": "Đậu hũ sốt cà chua",
    "summary": "Món thiên về rau, nấm hoặc đậu hũ cho bữa ăn nhẹ nhàng hơn.",
    "category": "Món chay / rau",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "đậu hũ",
        "amount": "400 g"
      },
      {
        "name": "cà chua",
        "amount": "4 quả"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế đậu hũ, cà chua, hành; rau và nấm rửa nhanh rồi để ráo.",
      "Làm nóng nồi/chảo với một ít dầu, cho nguyên liệu lâu chín vào trước.",
      "Thêm đậu hũ/rau/nấm còn lại và nêm nhẹ; đảo hoặc om đến khi vừa chín.",
      "Nếm lại, thêm rau thơm hoặc tiêu nếu phù hợp rồi dùng nóng."
    ],
    "preferenceTags": [
      "vegetarian",
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-082-dau-hu-sot-nam",
    "nameVi": "Đậu hũ sốt nấm",
    "summary": "Món thiên về rau, nấm hoặc đậu hũ cho bữa ăn nhẹ nhàng hơn.",
    "category": "Món chay / rau",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "đậu hũ",
        "amount": "400 g"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      }
    ],
    "steps": [
      "Sơ chế đậu hũ, nấm; rau và nấm rửa nhanh rồi để ráo.",
      "Làm nóng nồi/chảo với một ít dầu, cho nguyên liệu lâu chín vào trước.",
      "Thêm đậu hũ/rau/nấm còn lại và nêm nhẹ; đảo hoặc om đến khi vừa chín.",
      "Nếm lại, thêm rau thơm hoặc tiêu nếu phù hợp rồi dùng nóng."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-083-rau-cu-kho-chay",
    "nameVi": "Rau củ kho chay",
    "summary": "Món thiên về rau, nấm hoặc đậu hũ cho bữa ăn nhẹ nhàng hơn.",
    "category": "Món chay / rau",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 30,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cà rốt",
        "amount": "2 củ"
      },
      {
        "name": "củ cải",
        "amount": "300 g"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "đậu hũ",
        "amount": "400 g"
      }
    ],
    "steps": [
      "Sơ chế cà rốt, củ cải, nấm, đậu hũ; rau và nấm rửa nhanh rồi để ráo.",
      "Làm nóng nồi/chảo với một ít dầu, cho nguyên liệu lâu chín vào trước.",
      "Thêm đậu hũ/rau/nấm còn lại và nêm nhẹ; đảo hoặc om đến khi vừa chín.",
      "Nếm lại, thêm rau thơm hoặc tiêu nếu phù hợp rồi dùng nóng."
    ],
    "preferenceTags": [
      "vegetarian"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-084-ca-tim-kho-dau-hu",
    "nameVi": "Cà tím kho đậu hũ",
    "summary": "Món thiên về rau, nấm hoặc đậu hũ cho bữa ăn nhẹ nhàng hơn.",
    "category": "Món chay / rau",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 25,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cà tím",
        "amount": "400 g"
      },
      {
        "name": "đậu hũ",
        "amount": "400 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế cà tím, đậu hũ, hành; rau và nấm rửa nhanh rồi để ráo.",
      "Làm nóng nồi/chảo với một ít dầu, cho nguyên liệu lâu chín vào trước.",
      "Thêm đậu hũ/rau/nấm còn lại và nêm nhẹ; đảo hoặc om đến khi vừa chín.",
      "Nếm lại, thêm rau thơm hoặc tiêu nếu phù hợp rồi dùng nóng."
    ],
    "preferenceTags": [
      "vegetarian"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-085-nam-kho-gung",
    "nameVi": "Nấm kho gừng",
    "summary": "Món thiên về rau, nấm hoặc đậu hũ cho bữa ăn nhẹ nhàng hơn.",
    "category": "Món chay / rau",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "nấm",
        "amount": "300 g"
      },
      {
        "name": "gừng",
        "amount": "20 g"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế nấm, gừng, hành; rau và nấm rửa nhanh rồi để ráo.",
      "Làm nóng nồi/chảo với một ít dầu, cho nguyên liệu lâu chín vào trước.",
      "Thêm đậu hũ/rau/nấm còn lại và nêm nhẹ; đảo hoặc om đến khi vừa chín.",
      "Nếm lại, thêm rau thơm hoặc tiêu nếu phù hợp rồi dùng nóng."
    ],
    "preferenceTags": [
      "vegetarian",
      "controlledCarbCandidate"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-086-goi-cuon-chay",
    "nameVi": "Gỏi cuốn chay",
    "summary": "Món thiên về rau, nấm hoặc đậu hũ cho bữa ăn nhẹ nhàng hơn.",
    "category": "Món chay / rau",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 10,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bánh tráng",
        "amount": "12 lá"
      },
      {
        "name": "đậu hũ",
        "amount": "400 g"
      },
      {
        "name": "bún",
        "amount": "500 g"
      },
      {
        "name": "rau sống",
        "amount": "250 g"
      }
    ],
    "steps": [
      "Sơ chế bánh tráng, đậu hũ, bún, rau sống; rau và nấm rửa nhanh rồi để ráo.",
      "Làm nóng nồi/chảo với một ít dầu, cho nguyên liệu lâu chín vào trước.",
      "Thêm đậu hũ/rau/nấm còn lại và nêm nhẹ; đảo hoặc om đến khi vừa chín.",
      "Nếm lại, thêm rau thơm hoặc tiêu nếu phù hợp rồi dùng nóng."
    ],
    "preferenceTags": [
      "vegetarian"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-087-goi-bap-cai-chay",
    "nameVi": "Gỏi bắp cải chay",
    "summary": "Món thiên về rau, nấm hoặc đậu hũ cho bữa ăn nhẹ nhàng hơn.",
    "category": "Món chay / rau",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 5,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bắp cải",
        "amount": "500 g"
      },
      {
        "name": "cà rốt",
        "amount": "2 củ"
      },
      {
        "name": "rau thơm",
        "amount": "80 g"
      }
    ],
    "steps": [
      "Sơ chế bắp cải, cà rốt, rau thơm; rau và nấm rửa nhanh rồi để ráo.",
      "Làm nóng nồi/chảo với một ít dầu, cho nguyên liệu lâu chín vào trước.",
      "Thêm đậu hũ/rau/nấm còn lại và nêm nhẹ; đảo hoặc om đến khi vừa chín.",
      "Nếm lại, thêm rau thơm hoặc tiêu nếu phù hợp rồi dùng nóng."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-088-sup-bi-do-chay",
    "nameVi": "Súp bí đỏ chay",
    "summary": "Món thiên về rau, nấm hoặc đậu hũ cho bữa ăn nhẹ nhàng hơn.",
    "category": "Món chay / rau",
    "mealTypes": [
      "sang",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 25,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bí đỏ",
        "amount": "500 g"
      },
      {
        "name": "sữa thực vật",
        "amount": "300 ml"
      },
      {
        "name": "hành",
        "amount": "3 nhánh"
      }
    ],
    "steps": [
      "Sơ chế bí đỏ, sữa thực vật, hành; rau và nấm rửa nhanh rồi để ráo.",
      "Làm nóng nồi/chảo với một ít dầu, cho nguyên liệu lâu chín vào trước.",
      "Thêm đậu hũ/rau/nấm còn lại và nêm nhẹ; đảo hoặc om đến khi vừa chín.",
      "Nếm lại, thêm rau thơm hoặc tiêu nếu phù hợp rồi dùng nóng."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSodiumCandidate",
      "light"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-089-com-chien-rau-cu",
    "nameVi": "Cơm chiên rau củ",
    "summary": "Món thiên về rau, nấm hoặc đậu hũ cho bữa ăn nhẹ nhàng hơn.",
    "category": "Món chay / rau",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "cơm",
        "amount": "vừa đủ"
      },
      {
        "name": "cà rốt",
        "amount": "2 củ"
      },
      {
        "name": "đậu Hà Lan",
        "amount": "150 g"
      },
      {
        "name": "bắp",
        "amount": "2 trái"
      }
    ],
    "steps": [
      "Sơ chế cơm, cà rốt, đậu Hà Lan, bắp; rau và nấm rửa nhanh rồi để ráo.",
      "Làm nóng nồi/chảo với một ít dầu, cho nguyên liệu lâu chín vào trước.",
      "Thêm đậu hũ/rau/nấm còn lại và nêm nhẹ; đảo hoặc om đến khi vừa chín.",
      "Nếm lại, thêm rau thơm hoặc tiêu nếu phù hợp rồi dùng nóng."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-090-com-gao-lut-rau-cu",
    "nameVi": "Cơm gạo lứt rau củ",
    "summary": "Món thiên về rau, nấm hoặc đậu hũ cho bữa ăn nhẹ nhàng hơn.",
    "category": "Món chay / rau",
    "mealTypes": [
      "trua",
      "toi"
    ],
    "servings": 4,
    "prepMinutes": 15,
    "cookMinutes": 35,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "gạo lứt",
        "amount": "220 g"
      },
      {
        "name": "bông cải",
        "amount": "350 g"
      },
      {
        "name": "cà rốt",
        "amount": "2 củ"
      },
      {
        "name": "nấm",
        "amount": "300 g"
      }
    ],
    "steps": [
      "Sơ chế gạo lứt, bông cải, cà rốt, nấm; rau và nấm rửa nhanh rồi để ráo.",
      "Làm nóng nồi/chảo với một ít dầu, cho nguyên liệu lâu chín vào trước.",
      "Thêm đậu hũ/rau/nấm còn lại và nêm nhẹ; đảo hoặc om đến khi vừa chín.",
      "Nếm lại, thêm rau thơm hoặc tiêu nếu phù hợp rồi dùng nóng."
    ],
    "preferenceTags": [
      "vegetarian"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-091-banh-mi-trung-op-la",
    "nameVi": "Bánh mì trứng ốp la",
    "summary": "Món đơn giản cho bữa sáng hoặc bữa nhẹ trong ngày.",
    "category": "Món sáng / nhẹ",
    "mealTypes": [
      "sang"
    ],
    "servings": 2,
    "prepMinutes": 8,
    "cookMinutes": 8,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bánh mì",
        "amount": "2 ổ"
      },
      {
        "name": "trứng",
        "amount": "4 quả"
      },
      {
        "name": "dưa leo",
        "amount": "2 quả"
      }
    ],
    "steps": [
      "Chuẩn bị bánh mì, trứng, dưa leo.",
      "Làm chín phần nguyên liệu cần nấu theo phương pháp của món.",
      "Phối các thành phần lại, nêm vừa khẩu vị và hạn chế thêm đường/muối khi không cần thiết.",
      "Dùng ngay sau khi hoàn thiện để giữ hương vị."
    ],
    "preferenceTags": [
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-092-banh-mi-uc-ga-rau",
    "nameVi": "Bánh mì ức gà rau",
    "summary": "Món đơn giản cho bữa sáng hoặc bữa nhẹ trong ngày.",
    "category": "Món sáng / nhẹ",
    "mealTypes": [
      "sang",
      "an_nhe"
    ],
    "servings": 2,
    "prepMinutes": 15,
    "cookMinutes": 15,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bánh mì",
        "amount": "2 ổ"
      },
      {
        "name": "ức gà",
        "amount": "350 g"
      },
      {
        "name": "rau xà lách",
        "amount": "150 g"
      }
    ],
    "steps": [
      "Chuẩn bị bánh mì, ức gà, rau xà lách.",
      "Làm chín phần nguyên liệu cần nấu theo phương pháp của món.",
      "Phối các thành phần lại, nêm vừa khẩu vị và hạn chế thêm đường/muối khi không cần thiết.",
      "Dùng ngay sau khi hoàn thiện để giữ hương vị."
    ],
    "preferenceTags": [
      "family"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-093-xoi-dau-xanh",
    "nameVi": "Xôi đậu xanh",
    "summary": "Món đơn giản cho bữa sáng hoặc bữa nhẹ trong ngày.",
    "category": "Món sáng / nhẹ",
    "mealTypes": [
      "sang"
    ],
    "servings": 2,
    "prepMinutes": 20,
    "cookMinutes": 40,
    "difficulty": "Vừa",
    "ingredients": [
      {
        "name": "gạo nếp",
        "amount": "300 g"
      },
      {
        "name": "đậu xanh",
        "amount": "150 g"
      }
    ],
    "steps": [
      "Chuẩn bị gạo nếp, đậu xanh.",
      "Làm chín phần nguyên liệu cần nấu theo phương pháp của món.",
      "Phối các thành phần lại, nêm vừa khẩu vị và hạn chế thêm đường/muối khi không cần thiết.",
      "Dùng ngay sau khi hoàn thiện để giữ hương vị."
    ],
    "preferenceTags": [
      "vegetarian"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-094-khoai-lang-va-trung-luoc",
    "nameVi": "Khoai lang và trứng luộc",
    "summary": "Món đơn giản cho bữa sáng hoặc bữa nhẹ trong ngày.",
    "category": "Món sáng / nhẹ",
    "mealTypes": [
      "sang",
      "an_nhe"
    ],
    "servings": 2,
    "prepMinutes": 5,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "khoai lang",
        "amount": "500 g"
      },
      {
        "name": "trứng",
        "amount": "4 quả"
      }
    ],
    "steps": [
      "Chuẩn bị khoai lang, trứng.",
      "Làm chín phần nguyên liệu cần nấu theo phương pháp của món.",
      "Phối các thành phần lại, nêm vừa khẩu vị và hạn chế thêm đường/muối khi không cần thiết.",
      "Dùng ngay sau khi hoàn thiện để giữ hương vị."
    ],
    "preferenceTags": [
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-095-sua-chua-trai-cay",
    "nameVi": "Sữa chua trái cây",
    "summary": "Món đơn giản cho bữa sáng hoặc bữa nhẹ trong ngày.",
    "category": "Món sáng / nhẹ",
    "mealTypes": [
      "sang",
      "an_nhe"
    ],
    "servings": 2,
    "prepMinutes": 5,
    "cookMinutes": 0,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "sữa chua",
        "amount": "2 hũ"
      },
      {
        "name": "trái cây",
        "amount": "300 g"
      }
    ],
    "steps": [
      "Chuẩn bị sữa chua, trái cây.",
      "Làm chín phần nguyên liệu cần nấu theo phương pháp của món.",
      "Phối các thành phần lại, nêm vừa khẩu vị và hạn chế thêm đường/muối khi không cần thiết.",
      "Dùng ngay sau khi hoàn thiện để giữ hương vị."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-096-yen-mach-chuoi",
    "nameVi": "Yến mạch chuối",
    "summary": "Món đơn giản cho bữa sáng hoặc bữa nhẹ trong ngày.",
    "category": "Món sáng / nhẹ",
    "mealTypes": [
      "sang"
    ],
    "servings": 2,
    "prepMinutes": 5,
    "cookMinutes": 8,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "yến mạch",
        "amount": "100 g"
      },
      {
        "name": "chuối",
        "amount": "2 quả"
      },
      {
        "name": "sữa",
        "amount": "300 ml"
      }
    ],
    "steps": [
      "Chuẩn bị yến mạch, chuối, sữa.",
      "Làm chín phần nguyên liệu cần nấu theo phương pháp của món.",
      "Phối các thành phần lại, nêm vừa khẩu vị và hạn chế thêm đường/muối khi không cần thiết.",
      "Dùng ngay sau khi hoàn thiện để giữ hương vị."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-097-trung-luoc-rau-cu",
    "nameVi": "Trứng luộc rau củ",
    "summary": "Món đơn giản cho bữa sáng hoặc bữa nhẹ trong ngày.",
    "category": "Món sáng / nhẹ",
    "mealTypes": [
      "sang",
      "an_nhe"
    ],
    "servings": 2,
    "prepMinutes": 10,
    "cookMinutes": 10,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "trứng",
        "amount": "4 quả"
      },
      {
        "name": "cà chua",
        "amount": "4 quả"
      },
      {
        "name": "dưa leo",
        "amount": "2 quả"
      },
      {
        "name": "xà lách",
        "amount": "150 g"
      }
    ],
    "steps": [
      "Chuẩn bị trứng, cà chua, dưa leo, xà lách.",
      "Làm chín phần nguyên liệu cần nấu theo phương pháp của món.",
      "Phối các thành phần lại, nêm vừa khẩu vị và hạn chế thêm đường/muối khi không cần thiết.",
      "Dùng ngay sau khi hoàn thiện để giữ hương vị."
    ],
    "preferenceTags": [
      "controlledCarbCandidate",
      "lowerSodiumCandidate",
      "light",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-098-bap-luoc",
    "nameVi": "Bắp luộc",
    "summary": "Món đơn giản cho bữa sáng hoặc bữa nhẹ trong ngày.",
    "category": "Món sáng / nhẹ",
    "mealTypes": [
      "sang",
      "an_nhe"
    ],
    "servings": 2,
    "prepMinutes": 5,
    "cookMinutes": 20,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bắp",
        "amount": "2 trái"
      }
    ],
    "steps": [
      "Chuẩn bị bắp.",
      "Làm chín phần nguyên liệu cần nấu theo phương pháp của món.",
      "Phối các thành phần lại, nêm vừa khẩu vị và hạn chế thêm đường/muối khi không cần thiết.",
      "Dùng ngay sau khi hoàn thiện để giữ hương vị."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-099-sinh-to-bo-it-ngot",
    "nameVi": "Sinh tố bơ ít ngọt",
    "summary": "Món đơn giản cho bữa sáng hoặc bữa nhẹ trong ngày.",
    "category": "Món sáng / nhẹ",
    "mealTypes": [
      "sang",
      "an_nhe"
    ],
    "servings": 2,
    "prepMinutes": 5,
    "cookMinutes": 0,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "bơ",
        "amount": "1 quả"
      },
      {
        "name": "sữa không đường",
        "amount": "300 ml"
      }
    ],
    "steps": [
      "Chuẩn bị bơ, sữa không đường.",
      "Làm chín phần nguyên liệu cần nấu theo phương pháp của món.",
      "Phối các thành phần lại, nêm vừa khẩu vị và hạn chế thêm đường/muối khi không cần thiết.",
      "Dùng ngay sau khi hoàn thiện để giữ hương vị."
    ],
    "preferenceTags": [
      "vegetarian",
      "lowerSugarCandidate",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  },
  {
    "id": "bloom-v1-100-trai-cay-theo-mua-va-sua-chua",
    "nameVi": "Trái cây theo mùa và sữa chua",
    "summary": "Món đơn giản cho bữa sáng hoặc bữa nhẹ trong ngày.",
    "category": "Món sáng / nhẹ",
    "mealTypes": [
      "sang",
      "an_nhe"
    ],
    "servings": 2,
    "prepMinutes": 5,
    "cookMinutes": 0,
    "difficulty": "Dễ",
    "ingredients": [
      {
        "name": "trái cây theo mùa",
        "amount": "300 g"
      },
      {
        "name": "sữa chua",
        "amount": "2 hũ"
      }
    ],
    "steps": [
      "Chuẩn bị trái cây theo mùa, sữa chua.",
      "Làm chín phần nguyên liệu cần nấu theo phương pháp của món.",
      "Phối các thành phần lại, nêm vừa khẩu vị và hạn chế thêm đường/muối khi không cần thiết.",
      "Dùng ngay sau khi hoàn thiện để giữ hương vị."
    ],
    "preferenceTags": [
      "vegetarian",
      "quick"
    ],
    "nutritionNote": "Thông tin phù hợp ăn uống chỉ là gợi ý theo cách chế biến; không phải khuyến nghị điều trị hay xác nhận món ăn an toàn cho bệnh lý."
  }
];
