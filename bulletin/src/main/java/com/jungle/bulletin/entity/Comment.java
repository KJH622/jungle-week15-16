package com.jungle.bulletin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "comments") // DB comments 테이블과 매핑
@Getter
@Setter
@NoArgsConstructor // JPA는 기본 생성자 필수
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT") // 긴 텍스트 저장 가능하도록
    private String content;

    // 댓글(N) → 유저(1) : 작성자
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id") // DB에 user_id 컬럼으로 저장
    private User author;

    // 댓글(N) → 게시글(1) : 어떤 게시글에 달린 댓글인지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id") // DB에 post_id 컬럼으로 저장
    private Post post;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now(); // 생성 시 현재 시간 자동 입력

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate // 수정될 때마다 자동으로 현재 시간 업데이트
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}