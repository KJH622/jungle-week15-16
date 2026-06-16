package com.jungle.bulletin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "categories")
@Getter
@NoArgsConstructor
public class Category {

    // 카테고리 타입 — 허용된 값만 입력 가능하도록 enum으로 강제
    public enum CategoryType {
        DOMAIN,       // 도메인 (웹개발, 앱개발 등)
        PROJECT_TYPE  // 성격 (토이프로젝트, 해커톤 등)
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;  // "웹개발", "토이프로젝트" 등

    @Enumerated(EnumType.STRING)  // DB에 "DOMAIN", "PROJECT_TYPE" 문자열로 저장
    @Column(nullable = false)
    private CategoryType type;

    // 카테고리 생성 시 이름과 타입을 함께 받는 생성자
    public Category(String name, CategoryType type) {
        this.name = name;
        this.type = type;
    }
}