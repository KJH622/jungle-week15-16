package com.jungle.bulletin.repository;

import com.jungle.bulletin.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// JpaRepository 상속으로 기본 CRUD 자동 제공
public interface CommentRepository extends JpaRepository<Comment, Long> {

    // 특정 게시글의 댓글을 오래된 순으로 조회 (댓글은 오래된 것이 위에)
    List<Comment> findAllByPostIdOrderByCreatedAtAsc(Long postId);
}