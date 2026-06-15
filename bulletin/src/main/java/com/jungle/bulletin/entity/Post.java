package com.jungle.bulletin.entity;

// 게시글 DB 테이블과 매핑되는 엔티티
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT") // 긴 텍스트 저장 가능하도록
    private String content;

    // 게시글(N) → 유저(1) 연관관계
    @ManyToOne(fetch = FetchType.LAZY)  // 지연 로딩 — 필요할 때만 User 조회 (성능)
    @JoinColumn(name = "user_id")       // DB에 user_id 컬럼으로 저장
    private User author;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate // 수정될 때마다 자동으로 현재 시간 업데이트
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}