package com.jungle.bulletin.repository;

import com.jungle.bulletin.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// JpaRepository 상속으로 기본 CRUD 자동 제공
public interface TagRepository extends JpaRepository<Tag, Long> {

    // 태그 이름으로 조회 — 없으면 새로 생성, 있으면 재사용하기 위해
    Optional<Tag> findByName(String name);
}