package com.jungle.bulletin.repository;

import com.jungle.bulletin.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// JpaRepository<엔티티 타입, PK 타입>을 상속하면 기본 CRUD 자동 제공
public interface PostRepository extends JpaRepository<Post, Long> {

    // 메서드 이름 규칙: findBy + 필드명 + OrderBy + 필드명 + Desc
    // Spring이 이름을 읽고 SQL을 자동으로 만들어줌
    // → SELECT * FROM posts ORDER BY created_at DESC
    List<Post> findAllByOrderByCreatedAtDesc();
}