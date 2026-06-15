package com.jungle.bulletin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity                          // DB 테이블과 매핑되는 클래스
@Table(name = "users")           // 매핑할 테이블명 (user는 예약어라 users 사용)
@Getter                          // Lombok: 모든 필드의 getter 자동 생성
@Setter                          // Lombok: 모든 필드의 setter 자동 생성
@NoArgsConstructor               // Lombok: 기본 생성자 자동 생성 (JPA 필수)
public class User {

    @Id                                                      // Primary Key
    @GeneratedValue(strategy = GenerationType.IDENTITY)      // DB가 자동으로 1, 2, 3... 증가
    private Long id;

    @Column(nullable = false, unique = true)  // NOT NULL + 중복 불허
    private String email;

    @Column(nullable = false)                 // NOT NULL
    private String password;                  // BCrypt로 암호화된 값이 저장됨

    @Column(nullable = false)
    private String nickname;

    @Column(name = "created_at")             // DB 컬럼명은 created_at
    private LocalDateTime createdAt = LocalDateTime.now();  // 생성 시 현재 시간 자동 입력
}