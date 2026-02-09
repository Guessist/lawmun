/* ===== Dummy Data (나중에 DB/API로 교체) ===== */
const ALL_ROWS = [
  {
    div: "내국",
    right: "특허",
    status: "심사중",
    applicantNo: "BJI-2015-PT-001",
    applicant: "",
    appDate: "2025-11-11",
    appNo: "10-2015-00432",
    regDate: "",
    regNo: "",
    titleKo: "",
    note: ""
  },
  {
    div: "내국",
    right: "상표",
    status: "출원",
    applicantNo: "TM-2026-00012",
    applicant: "로문컴퍼니",
    appDate: "2026-01-18",
    appNo: "40-2026-0000123",
    regDate: "",
    regNo: "",
    titleKo: "ROMUN",
    note: "우선심사 검토"
  },
  {
    div: "외국",
    right: "디자인",
    status: "등록",
    applicantNo: "DS-2024-11001",
    applicant: "ROMUN Inc.",
    appDate: "2024-09-03",
    appNo: "DM/2024/11001",
    regDate: "2025-03-10",
    regNo: "D-2025-00321",
    titleKo: "차량 UI 디자인",
    note: ""
  }
];

let currentTab = "all";
let currentFiltered = [...ALL_ROWS];

/* ===== UI Helpers ===== */
function showModal(title, body){
  $("#msgModalTitle").text(title);
  $("#msgModalBody").text(body);
  $("#msgModal").modal("show");
}

function buildQueryPreview(){
  const baseField = $("#baseField").val();
  const baseValue = $("#baseValue").val();
  const baseOp = $(".btn-toggle[data-group='base'].active").data("op");

  const dateField = $("#dateField").val();
  const fromDate = $("#fromDate").val();
  const toDate = $("#toDate").val();
  const dateOp = $(".btn-toggle[data-group='date'].active").data("op");

  const textField = $("#textField").val();
  const textValue = $("#textValue").val();
  const textOp = $(".btn-toggle[data-group='text'].active").data("op");

  const parts = [];

  if(baseValue){
    parts.push(`(${baseField}=${baseValue})`);
  }
  if(fromDate || toDate){
    parts.push(`(${dateField}:${fromDate || "____-__-__"}~${toDate || "____-__-__"})`);
  }
  if(textValue){
    parts.push(`(${textField}~"${textValue}")`);
  }

  // 보기용: AND/NOT은 그룹 단위 버튼 표시만 반영
  // 실제 로직은 아래 applyFilters에서 처리
  const preview = parts.length ? parts.join(" AND ") : "";
  $("#queryBox").val(preview);

  return { baseOp, dateOp, textOp };
}

function matchesTab(row){
  if(currentTab === "all") return true;
  if(currentTab === "pat") return row.right === "특허";
  if(currentTab === "mark") return row.right === "상표";
  if(currentTab === "design") return row.right === "디자인";
  if(currentTab === "util") return row.right === "실용신안";
  return true;
}

function applyFilters(){
  const { baseOp, dateOp, textOp } = buildQueryPreview();

  const baseField = $("#baseField").val();
  const baseValue = $("#baseValue").val();

  const dateField = $("#dateField").val();
  const fromDate = $("#fromDate").val();
  const toDate = $("#toDate").val();

  const textField = $("#textField").val();
  const textValue = $("#textValue").val().trim();

  const filtered = ALL_ROWS.filter(row => {
    // 탭 필터
    if(!matchesTab(row)) return false;

    // 기본검색
    if(baseValue){
      const ok = String(row[baseField] || "") === String(baseValue);
      if(baseOp === "AND" && !ok) return false;
      if(baseOp === "NOT" && ok) return false;
    }

    // 일자검색
    if(fromDate || toDate){
      const v = row[dateField] || "";
      // 값이 없으면 범위검색에서 제외
      if(!v) return false;

      if(fromDate && v < fromDate){
        if(dateOp === "AND") return false;
      }
      if(toDate && v > toDate){
        if(dateOp === "AND") return false;
      }

      // NOT 의미: 범위에 “포함되는” 것을 제외
      if(dateOp === "NOT"){
        const inRange =
          (!fromDate || v >= fromDate) &&
          (!toDate || v <= toDate);
        if(inRange) return false;
      }
    }

    // 문자검색 (부분일치)
    if(textValue){
      const val = String(row[textField] || "");
      const ok = val.toLowerCase().includes(textValue.toLowerCase());
      if(textOp === "AND" && !ok) return false;
      if(textOp === "NOT" && ok) return false;
    }

    return true;
  });

  currentFiltered = filtered;
  renderTable(filtered);
  updateCounts(filtered.length);
}

function updateCounts(searchCount){
  $("#viewCnt").text(searchCount);
  $("#searchCnt").text(searchCount);
  $("#allCnt").text(ALL_ROWS.length);
}

/* ===== DataTable ===== */
let dt = null;

function renderTable(rows){
  const tbody = $("#casesTable tbody");
  tbody.empty();

  rows.forEach((r, idx) => {
    const tr = $(`
      <tr>
        <td><input type="checkbox" class="rowCk" data-idx="${idx}"></td>
        <td>${r.div || ""}</td>
        <td>${r.right || ""}</td>
        <td>${r.status || ""}</td>
        <td>${r.applicantNo || ""}</td>
        <td>${r.applicant || ""}</td>
        <td>${r.appDate || ""}</td>
        <td>${r.appNo || ""}</td>
        <td>${r.regDate || ""}</td>
        <td>${r.regNo || ""}</td>
        <td>${r.titleKo || ""}</td>
        <td>${r.note || ""}</td>
      </tr>
    `);
    tbody.append(tr);
  });

  // DataTable 초기화/재초기화
  if(dt){
    dt.destroy();
  }
  dt = $("#casesTable").DataTable({
    paging: false,
    info: false,
    searching: false,
    order: [],
    scrollX: true,
    scrollY: 340,
    scrollCollapse: true
  });
}

/* ===== Events ===== */
$(function(){
  // AND/NOT 토글
  $(document).on("click", ".btn-toggle", function(){
    const group = $(this).data("group");
    $(`.btn-toggle[data-group='${group}']`).removeClass("active");
    $(this).addClass("active");
    applyFilters();
  });

  // 입력 변화 시 쿼리 미리보기 & 적용
  $("#baseField,#baseValue,#dateField,#fromDate,#toDate,#textField,#textValue").on("change keyup", function(){
    applyFilters();
  });

  // 탭
  $(".tab").on("click", function(){
    $(".tab").removeClass("active");
    $(this).addClass("active");
    currentTab = $(this).data("tab");
    applyFilters();
  });

  // 검색/초기화
  $("#btnSearch").on("click", function(){
    applyFilters();
    showModal("검색", `검색 결과 ${currentFiltered.length}건`);
  });

  $("#btnReset").on("click", function(){
    $("#quickType").val("number");
    $("#quickQuery").val("");

    $("#baseField").val("div");
    $("#baseValue").val("");
    $("#dateField").val("appDate");
    $("#fromDate").val("");
    $("#toDate").val("");
    $("#textField").val("applicantNo");
    $("#textValue").val("");

    $(".btn-toggle[data-group='base']").removeClass("active");
    $(".btn-toggle[data-group='base'][data-op='AND']").addClass("active");
    $(".btn-toggle[data-group='date']").removeClass("active");
    $(".btn-toggle[data-group='date'][data-op='AND']").addClass("active");
    $(".btn-toggle[data-group='text']").removeClass("active");
    $(".btn-toggle[data-group='text'][data-op='AND']").addClass("active");

    $("#queryBox").val("");
    currentTab = "all";
    $(".tab").removeClass("active");
    $(".tab[data-tab='all']").addClass("active");

    applyFilters();
  });

  // Quick Search
  $("#btnQuickSearch").on("click", function(){
    const type = $("#quickType").val();
    const q = $("#quickQuery").val().trim();
    if(!q){
      showModal("안내", "검색어를 입력하세요.");
      return;
    }

    // 간단 규칙: 번호검색이면 출원번호/관리번호에서 찾고, 문자검색이면 출원인/국문명칭에서 찾기
    if(type === "number"){
      $("#textField").val("appNo");
      $("#textValue").val(q);
    } else {
      $("#textField").val("applicant");
      $("#textValue").val(q);
    }
    applyFilters();
  });

  // 체크박스 전체선택
  $("#ckAll").on("change", function(){
    $(".rowCk").prop("checked", this.checked);
  });

  // 액션 샘플
  $("#btnFieldSetting").on("click", () => showModal("항목설정", "항목설정 팝업/페이지로 연결하세요."));
  $("#btnExcel").on("click", () => showModal("엑셀변환", "선택자료를 엑셀로 변환하는 로직을 연결하세요."));
  $("#btnAutoCancel").on("click", () => showModal("자동취하사건", "자동취하사건 조회 기능을 연결하세요."));
  $("#btnDeleteSel").on("click", () => showModal("선택자료 삭제", "선택된 row 삭제 로직을 연결하세요."));

  // 신규 메뉴 샘플
  $(document).on("click", "[data-new]", function(e){
    e.preventDefault();
    showModal("신규", `신규 생성: ${$(this).data("new")}`);
  });

  // 최초 렌더
  renderTable(ALL_ROWS);
  updateCounts(ALL_ROWS.length);
  buildQueryPreview();
});
