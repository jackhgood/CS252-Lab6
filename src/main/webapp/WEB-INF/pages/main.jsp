<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://www.springframework.org/tags" prefix="spring" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<%@ taglib prefix="sec" uri="http://www.springframework.org/security/tags" %>
<%@ page language="java" pageEncoding="UTF-8" session="false"%>

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Gateway</title>

    <link rel="stylesheet" href="<c:url value="/css/main.css" />" />
</head>
<body>

<h1>Gateway</h1>
<button onclick="window.location.href='<c:url value="/play" />'">Create a New Level!</button>
<sec:authorize access="not hasAuthority('ROLE_USER')">
    <button onclick="window.location.href='<c:url value="/login" />'">Login</button>
    <button onclick="window.location.href='<c:url value="/register" />'">Register</button>
</sec:authorize>
<sec:authorize access="hasAuthority('ROLE_USER')">
    <button onclick="window.location.href='<c:url value="/logout?${_csrf.parameterName}=${_csrf.token}" />'">Logout</button>
</sec:authorize>

<br>

<sec:authorize access="not hasAuthority('ROLE_USER')">
    <H3 style="text-align: center">Login to View Your Levels!</H3>
</sec:authorize>
<sec:authorize access="hasAuthority('ROLE_USER')">
    <H3 style="text-align: center">Choose a Level to Play!</H3>
</sec:authorize>

<sec:authorize access="hasAuthority('ROLE_USER')">
<ul class="ll">
    <li class="litembreak">${un}</li>
    <c:forEach items="${levellist}" var="level">
        <form action="/play" method="get">
            <li class="litem"><input type="submit" name="level" value="${level}" /></li
            <input type="hidden" name="usr" value="${un}" />
        </form>
    </c:forEach>

    <c:forEach items="${multilist}" var="multi">
        <li class="space" li> </li>
        <li class="litembreak">${multi[0]}</li>
        <c:forEach items="${multi}" var="lvl" begin="1">
            <form action="/play" method="get">
                <li class="litem"><input type="submit" name="level" value="${lvl}" /></li>
                <input type="hidden" name="usr" value="${multi[0]}" />
            </form>
        </c:forEach>
    </c:forEach>
</ul>
</sec:authorize>

</body>
</html>