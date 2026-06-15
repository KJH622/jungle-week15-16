package com.jungle.bulletin.dto;

// 로그인 요청 데이터를 받는 그릇 (React → Spring)
import lombok.Getter;

@Getter // Lombok: getter 자동 생성
public class LoginRequest {

    private String email;
    private String password;
}