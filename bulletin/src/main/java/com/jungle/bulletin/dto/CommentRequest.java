package com.jungle.bulletin.dto;

import lombok.Getter;

// 댓글 작성/수정 시 클라이언트가 보내는 데이터 그릇
@Getter
public class CommentRequest {
    private String content;  // 댓글 본문만 받으면 됨 (작성자/게시글은 서버에서 처리)
}