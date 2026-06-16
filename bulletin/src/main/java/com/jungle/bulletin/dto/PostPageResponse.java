package com.jungle.bulletin.dto;

import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

// Page<PostResponse>에서 프론트에 필요한 필드만 골라 담는 래퍼 DTO
@Getter
public class PostPageResponse {

    private List<PostResponse> content;    // 게시글 목록
    private int totalPages;                // 총 페이지 수
    private long totalElements;            // 전체 게시글 수
    private int pageNumber;                // 현재 페이지 번호 (0부터 시작)
    private int pageSize;                  // 페이지당 게시글 수

    // Page<PostResponse>를 받아서 필요한 값만 꺼내 담는 생성자
    public PostPageResponse(Page<PostResponse> page) {
        this.content = page.getContent();
        this.totalPages = page.getTotalPages();
        this.totalElements = page.getTotalElements();
        this.pageNumber = page.getNumber();
        this.pageSize = page.getSize();
    }
}
