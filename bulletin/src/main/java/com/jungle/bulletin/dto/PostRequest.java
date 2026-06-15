package com.jungle.bulletin.dto;

import lombok.Getter;

// 클라이언트가 게시글 작성/수정 시 보내는 데이터
@Getter
public class PostRequest {
    private String title;    // 제목
    private String content;  // 내용
}