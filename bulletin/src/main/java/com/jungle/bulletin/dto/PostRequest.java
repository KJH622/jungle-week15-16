package com.jungle.bulletin.dto;

import lombok.Getter;
import java.util.List;

// 클라이언트가 게시글 작성/수정 시 보내는 데이터
@Getter
public class PostRequest {
    private String title;    // 제목
    private String content;  // 내용
    private List<String> tags;        // 태그 이름 목록 (없으면 자동 생성, 있으면 재사용)
    private Long domainId;            // 도메인 카테고리 id (미리 정해진 목록에서 선택)
    private Long projectTypeId;       // 성격 카테고리 id (미리 정해진 목록에서 선택)
    private String githubUrl; // GitHub URL (선택, null 허용)
}