package com.jungle.bulletin.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component  // Spring이 이 클래스를 Bean으로 관리 → 다른 곳에서 주입해서 쓸 수 있음
public class JwtUtil {

    private final SecretKey secretKey;  // 토큰 서명에 쓰는 비밀키
    private final long expiration;      // 토큰 만료 시간 (ms)

    // application.properties에서 값을 읽어옴
    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expiration
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    // 토큰 생성 (로그인 성공 시 호출)
    public String generateToken(String email) {
        return Jwts.builder()
                .subject(email)                                               // 토큰 안에 이메일 저장
                .issuedAt(new Date())                                         // 발급 시간
                .expiration(new Date(System.currentTimeMillis() + expiration)) // 만료 시간
                .signWith(secretKey)                                           // 비밀키로 서명
                .compact();
    }

    // 토큰에서 이메일 꺼내기
    public String getEmail(String token) {
        return parseClaims(token).getSubject();
    }

    // 토큰 유효성 검증
    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;  // 만료되거나 위조된 토큰이면 false
        }
    }

    // 토큰 파싱 (내부용)
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}