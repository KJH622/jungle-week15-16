package com.jungle.bulletin.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter { // 요청당 딱 한 번만 실행되는 필터

    private final JwtUtil jwtUtil;                       // 토큰 검증/파싱 도구
    private final UserDetailsService userDetailsService; // 이메일로 유저 조회

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization"); // 요청 헤더에서 토큰 꺼냄

        // Bearer 토큰 없으면 인증 없이 그냥 통과 (로그인/회원가입 요청 등)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7); // "Bearer " 7글자 제거 → 순수 토큰만 추출

        if (jwtUtil.isValid(token)) {                                          // 토큰 유효성 검증
            String email = jwtUtil.getEmail(token);                            // 토큰에서 이메일 꺼냄
            UserDetails userDetails = userDetailsService.loadUserByUsername(email); // DB에서 유저 조회

            // Spring Security에 "이 사람 인증됐음" 등록 → 이후 Controller에서 유저 정보 사용 가능
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                    );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response); // 다음 필터(또는 Controller)로 넘김
    }
}